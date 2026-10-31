import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergeMembers, parseDirectoryMembers } from "@/lib/member-api";
import { _resetEnvForTests } from "@/lib/env";
import { searchDirectory } from "@/lib/services/member-directory";

// Shaped like the real GetSearchMembers answer (invented people, but with the sensitive fields the API really sends).
const entry = (over = {}) => ({
  memberId: 3326,
  displayMemberId: 3926,
  firstName: "ASHISHBHAI",
  lastName: "PATEL",
  fatherName: "PRAHLADBHAI",
  mobile: "9227136319",
  mobileNoCountryCode: "+91",
  fatherMobile: "7487712122",
  fathersMobileCountryCode: "+91",
  birthday: "1981-06-29T00:00:00",
  memberType: "Member",
  city: "VADODARA",
  pincode: "390002",
  aadharNo: "111122223333",
  panNo: "ABCDE1234F",
  emailId: "someone@example.org",
  profilePath: "https://example.org/photo.jpg",
  ...over,
});

describe("parseDirectoryMembers", () => {
  it("keeps every entry whatever its memberType", () => {
    const rows = parseDirectoryMembers([entry(), entry({ memberId: 17888, memberType: "LoginRequest" }), entry({ memberId: 5, memberType: "" })]);
    expect(rows.map((r) => r.memberId)).toEqual([3326, 17888, 5]);
  });

  it("maps to the entry form's fields and exposes the Member ID", () => {
    expect(parseDirectoryMembers([entry()])[0]).toEqual({
      source: "directory",
      key: "directory-3326",
      memberId: 3326,
      displayMemberId: 3926,
      name: "ASHISHBHAI",
      fatherName: "PRAHLADBHAI",
      surname: "PATEL",
      gam: "VADODARA",
      pincode: "390002",
      mobileNo: "9227136319",
      mobileText: "9227136319",
      dialCode: "+91",
      fatherMobile: "7487712122",
      birthday: "1981-06-29",
      memberType: "Member",
      photoUrl: "https://example.org/photo.jpg",
    });
  });

  it("fills the form with a number of another country as +code and the number, and shows it with its dial code", () => {
    const [row] = parseDirectoryMembers([entry({ mobile: "4164143653", mobileNoCountryCode: "+1", fatherMobile: "09227136319", fathersMobileCountryCode: null })]);
    expect(row.mobileText).toBe("+1 4164143653");
    expect(row.mobileNo).toBe("+14164143653");
    expect(row.fatherMobile).toBe("9227136319");
  });

  it("drops the national 0 of a foreign number, and an unusable foreign number gives an empty form value", () => {
    expect(parseDirectoryMembers([entry({ mobile: "07911123456", mobileNoCountryCode: "+44" })])[0].mobileNo).toBe("+447911123456");
    expect(parseDirectoryMembers([entry({ mobile: "123", mobileNoCountryCode: "+44" })])[0].mobileNo).toBe("");
    expect(parseDirectoryMembers([entry({ mobile: "4164143653", mobileNoCountryCode: "+91" })])[0].mobileNo).toBe(""); // not an Indian mobile
  });

  it("passes the dial code of the mobile on, or an empty one when the API sent none", () => {
    expect(parseDirectoryMembers([entry({ mobileNoCountryCode: " +44 " })])[0].dialCode).toBe("+44");
    for (const none of [undefined, null, ""]) expect(parseDirectoryMembers([entry({ mobileNoCountryCode: none })])[0].dialCode).toBe("");
  });

  it("drops a birthday that is missing, impossible, a placeholder or in the future", () => {
    const birthday = (value) => parseDirectoryMembers([entry({ birthday: value })])[0].birthday;
    expect(birthday("2015-10-22T00:00:00")).toBe("2015-10-22");
    for (const bad of [null, "", "0001-01-01T00:00:00", "1981-02-30T00:00:00", "2999-01-01T00:00:00", "soon"]) expect(birthday(bad)).toBe("");
  });

  it("passes on nothing but the fields the window needs", () => {
    const keys = Object.keys(parseDirectoryMembers([entry()])[0]).sort();
    expect(keys).toEqual(["birthday", "dialCode", "fatherMobile", "fatherName", "gam", "key", "memberId", "memberType", "mobileNo", "mobileText", "name", "photoUrl", "pincode", "source", "surname", "displayMemberId"].sort());
  });

  it("never passes Aadhaar, PAN or e-mail to the browser", () => {
    const json = JSON.stringify(parseDirectoryMembers([entry()]));
    for (const secret of ["111122223333", "ABCDE1234F", "someone@example.org"]) expect(json).not.toContain(secret);
  });

  it("keeps the profile photo only when it is an https link", () => {
    const photo = (profilePath) => parseDirectoryMembers([entry({ profilePath })])[0].photoUrl;
    expect(photo("https://members.example.org/p/1.jpg?_=63810")).toBe("https://members.example.org/p/1.jpg?_=63810");
    for (const bad of ["", null, "http://example.org/a.jpg", "javascript:alert(1)", "data:image/png;base64,AAAA", "not a url"]) expect(photo(bad)).toBe("");
  });

  it("drops an unusable mobile / pincode instead of failing, and skips entries with no name or id", () => {
    const [row] = parseDirectoryMembers([entry({ mobile: "12345", pincode: "39" })]);
    expect(row.mobileNo).toBe("");
    expect(row.pincode).toBe("");
    expect(parseDirectoryMembers([entry({ firstName: "", lastName: null }), entry({ memberId: null })])).toEqual([]);
  });

  it("returns [] for anything that is not a list", () => {
    expect(parseDirectoryMembers(null)).toEqual([]);
    expect(parseDirectoryMembers({ message: "denied" })).toEqual([]);
  });
});

describe("mergeMembers", () => {
  const saved = [{ id: 7, name: "ASHISHBHAI", fatherName: "PRAHLADBHAI", surname: "PATEL", gam: "VADODARA", jillo: "VADODARA", mobileNo: "9227136319" }];

  it("lists saved Members first, tagged as saved", () => {
    const rows = mergeMembers(saved, parseDirectoryMembers([entry({ memberId: 9, firstName: "KIRAN", mobile: "9000000001" })]));
    expect(rows.map((r) => [r.source, r.key])).toEqual([["saved", "saved-7"], ["directory", "directory-9"]]);
  });

  it("does not list the same person twice (same name + village, or same mobile)", () => {
    const sameName = parseDirectoryMembers([entry({ mobile: "" })]);
    const sameMobile = parseDirectoryMembers([entry({ memberId: 2, firstName: "ASHISH", mobile: "9227136319", city: "SURAT" })]);
    expect(mergeMembers(saved, [...sameName, ...sameMobile])).toHaveLength(1);
  });

  it("keeps a directory Member who only shares a name with a saved one from another village", () => {
    const other = parseDirectoryMembers([entry({ memberId: 3, city: "SURAT", mobile: "9111111111" })]);
    expect(mergeMembers(saved, other)).toHaveLength(2);
  });
});

describe("searchDirectory", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://x";
    process.env.SESSION_SECRET = "s".repeat(40);
    process.env.MEMBER_API_URL = "https://directory.example.org";
    process.env.MEMBER_API_KEY = "test-key";
    process.env.MEMBER_API_ORIGIN = "https://my-site.example.org/some/page";
    _resetEnvForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...original };
    _resetEnvForTests();
  });

  it("calls GetSearchMembers with the key and app headers and returns everything the API sent", async () => {
    const fetchMock = vi.fn(async () => Response.json([entry(), entry({ memberId: 2, memberType: "LoginRequest" })]));
    vi.stubGlobal("fetch", fetchMock);
    const result = await searchDirectory("ashish vadodara", { limit: 100 });
    expect(result.failed).toBe(false);
    expect(result.more).toBe(false);
    expect(result.nextOffset).toBe(2);
    expect(result.rows.map((r) => r.memberId)).toEqual([3326, 2]);
    const [url, init] = fetchMock.mock.calls[0];
    // one more than the page is asked for, to learn whether there is more (the API gives only 100 rows without a topLimit)
    expect(String(url)).toMatch(/^https:\/\/directory\.example\.org\/Member\/GetSearchMembers\?keyword=ashish\+vadodara&topLimit=101$/);
    expect(init.headers).toMatchObject({ apitokenkey: "test-key", appname: "GVHApp", apptype: "GVHWebApp", appversion: "1.0" });
  });

  // The real API has no paging: it only knows topLimit, its order is stable and a smaller topLimit is the start of a bigger one.
  const fakeDirectory = (total) => {
    const all = Array.from({ length: total }, (_, i) => entry({ memberId: i + 1, displayMemberId: i + 1 }));
    return vi.fn(async (url) => Response.json(all.slice(0, Number(new URL(url).searchParams.get("topLimit")))));
  };

  it("reads the directory a page at a time: offset .. offset + limit of the answer, and says where the next page starts", async () => {
    const fetchMock = fakeDirectory(233);
    vi.stubGlobal("fetch", fetchMock);
    const ids = [];
    let offset = 0;
    let pages = 0;
    for (;;) {
      const page = await searchDirectory("bhavesh", { limit: 100, offset });
      ids.push(...page.rows.map((r) => r.memberId));
      pages += 1;
      expect(page.nextOffset).toBe(offset + page.rows.length);
      if (!page.more) break;
      offset = page.nextOffset;
    }
    expect(pages).toBe(3);
    expect(ids).toEqual(Array.from({ length: 233 }, (_, i) => i + 1)); // every row once, in order, nothing lost between pages
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get("topLimit"))).toEqual(["101", "201", "301"]);
  });

  it("a page that ends exactly at the last row has no more; a page past the end is empty", async () => {
    vi.stubGlobal("fetch", fakeDirectory(200));
    expect((await searchDirectory("a", { limit: 100, offset: 100 })).more).toBe(false);
    vi.stubGlobal("fetch", fakeDirectory(150));
    const past = await searchDirectory("a", { limit: 100, offset: 200 });
    expect(past).toMatchObject({ rows: [], more: false, nextOffset: 200, failed: false });
  });

  it("gives the untouched API rows of the page as `raw` only in development", async () => {
    vi.stubGlobal("fetch", fakeDirectory(3));
    expect((await searchDirectory("x", { limit: 2 })).raw).toBeUndefined(); // tests run with NODE_ENV=test
    vi.stubEnv("NODE_ENV", "development");
    try {
      const { raw } = await searchDirectory("x", { limit: 2, offset: 1 });
      expect(raw.offset).toBe(1);
      expect(raw.rows.map((r) => r.memberId)).toEqual([2, 3]);
      expect(raw.rows[0]).toMatchObject({ aadharNo: "111122223333" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("a cancelled search (the user typed on) stops the call to the API and is not reported as a failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let sent;
    vi.stubGlobal("fetch", vi.fn((url, init) => {
      sent = init.signal;
      return new Promise((resolve, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    }));
    const controller = new AbortController();
    const pending = searchDirectory("a", { limit: 5000, signal: controller.signal });
    controller.abort();
    expect(await pending).toEqual({ rows: [], more: false, nextOffset: 0, failed: false });
    expect(sent.aborted).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it("sends the whitelisted domain from MEMBER_API_ORIGIN as Origin / Referer, and nothing when it is empty or invalid", async () => {
    const fetchMock = vi.fn(async () => Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    await searchDirectory("x", { limit: 10 });
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ origin: "https://my-site.example.org", referer: "https://my-site.example.org/" });
    for (const value of ["", "   ", "not a url"]) {
      process.env.MEMBER_API_ORIGIN = value;
      _resetEnvForTests();
      await searchDirectory("x", { limit: 10 });
      const headers = fetchMock.mock.calls.at(-1)[1].headers;
      expect(headers.origin).toBeUndefined();
      expect(headers.referer).toBeUndefined();
    }
  });

  it("reports a failure (and no rows) when the directory is down or refuses the call", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 403 })));
    expect(await searchDirectory("x", { limit: 10 })).toEqual({ rows: [], more: false, nextOffset: 0, failed: true });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    expect(await searchDirectory("x", { limit: 10, offset: 30 })).toEqual({ rows: [], more: false, nextOffset: 30, failed: true });
  });

  it("does nothing without a key", async () => {
    process.env.MEMBER_API_KEY = "  ";
    _resetEnvForTests();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchDirectory("x", { limit: 10 })).toEqual({ rows: [], more: false, nextOffset: 0, failed: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
