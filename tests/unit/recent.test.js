import { describe, expect, it } from "vitest";
import { withRecent } from "@/lib/recent";

const options = [
  { value: 1, label: "A" },
  { value: 2, label: "B" },
  { value: 3, label: "C" },
  { value: 4, label: "D" },
];

describe("withRecent", () => {
  it("puts recently used options first (newest first), marked, and keeps the rest in order", () => {
    expect(withRecent(options, [3, 1])).toEqual([
      { value: 3, label: "C", recent: true },
      { value: 1, label: "A", recent: true },
      { value: 2, label: "B" },
      { value: 4, label: "D" },
    ]);
  });

  it("ignores unknown and repeated ids, and works with nothing recent", () => {
    expect(withRecent(options, [9, 2, 2]).map((o) => [o.value, Boolean(o.recent)])).toEqual([[2, true], [1, false], [3, false], [4, false]]);
    expect(withRecent(options)).toEqual(options);
  });

  it("marks nothing when several options are recent and they are all of them", () => {
    expect(withRecent(options, [4, 3, 2, 1])).toEqual(options);
  });

  it("always marks a single last-used option, even in a list of one", () => {
    expect(withRecent([options[0]], [1])).toEqual([{ ...options[0], recent: true }]);
  });
});
