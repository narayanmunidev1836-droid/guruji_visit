import { describe, expect, it } from "vitest";
import { formatBytes, formatDate, formatExifDateTime, parseDateInput, timeAgo, toDateInputValue } from "@/lib/format";

describe("parseDateInput", () => {
  it("parses YYYY-MM-DD as UTC midnight", () => {
    expect(parseDateInput("2019-03-14")?.toISOString()).toBe("2019-03-14T00:00:00.000Z");
  });
  it("returns null for empty and undefined for invalid", () => {
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput("14/03/2019")).toBeUndefined();
    expect(parseDateInput("2019-02-30")).toBeUndefined();
    expect(parseDateInput("2019-13-01")).toBeUndefined();
    expect(parseDateInput("not a date")).toBeUndefined();
  });
  it("round-trips through the date input helper", () => {
    expect(toDateInputValue(parseDateInput("2020-01-05"))).toBe("2020-01-05");
  });
});

describe("display formatting", () => {
  it("formats dates in UTC so the calendar day never shifts", () => {
    expect(formatDate(new Date("2019-03-14T00:00:00.000Z"))).toBe("14 Mar 2019");
    expect(formatDate(null)).toBe("-");
  });
  it("formats EXIF wall-clock time without a zone shift", () => {
    expect(formatExifDateTime(new Date("2019-03-14T10:22:00.000Z"))).toContain("10:22");
  });
  it("formats file sizes", () => {
    expect(formatBytes(null)).toBe("-");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
  it("formats relative times", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    expect(timeAgo(null, now)).toBe("never");
    expect(timeAgo(new Date("2026-10-18T11:59:40Z"), now)).toBe("just now");
    expect(timeAgo(new Date("2026-10-18T11:30:00Z"), now)).toBe("30 min ago");
    expect(timeAgo(new Date("2026-10-18T06:00:00Z"), now)).toBe("6 h ago");
    expect(timeAgo(new Date("2026-10-10T12:00:00Z"), now)).toBe("8 days ago");
  });
});
