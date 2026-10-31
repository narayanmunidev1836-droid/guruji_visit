import { describe, expect, it } from "vitest";
import { highlightParts } from "@/lib/highlight";

const marked = (text, query) => highlightParts(text, query).filter((part) => part.match).map((part) => part.text);

describe("highlightParts", () => {
  it("marks the typed part in any case and keeps the text as it was", () => {
    const parts = highlightParts("AMITBHAI GOSWAMI", "gos");
    expect(parts).toEqual([{ text: "AMITBHAI ", match: false }, { text: "GOS", match: true }, { text: "WAMI", match: false }]);
    expect(parts.map((part) => part.text).join("")).toBe("AMITBHAI GOSWAMI");
  });

  it("marks every word of the search, and every place it occurs", () => {
    expect(marked("SWAMI SWAMINARAYAN SWAMI", "swami")).toEqual(["SWAMI", "SWAMI", "SWAMI"]);
    expect(marked("RAMESH KANJI PATEL", "ramesh patel")).toEqual(["RAMESH", "PATEL"]);
  });

  it("the longer word wins where words overlap", () => {
    expect(marked("PATELIYA", "pat patel")).toEqual(["PATEL"]);
  });

  it("works for numbers and Gujarati text", () => {
    expect(marked("9979280909", "9979")).toEqual(["9979"]);
    expect(marked("આશિષભાઈ પટેલ", "પટેલ")).toEqual(["પટેલ"]);
  });

  it("treats the search as plain text, not as a pattern", () => {
    expect(marked("A.B (C) +1", ".")).toEqual(["."]);
    expect(marked("A+B", "a+b")).toEqual(["A+B"]);
    expect(() => highlightParts("x", "(")).not.toThrow();
    expect(() => highlightParts("x", "[")).not.toThrow();
  });

  it("marks nothing for an empty search or empty text", () => {
    expect(highlightParts("PATEL", "")).toEqual([{ text: "PATEL", match: false }]);
    expect(highlightParts("PATEL", "   ")).toEqual([{ text: "PATEL", match: false }]);
    expect(highlightParts(null, "x")).toEqual([{ text: "", match: false }]);
    expect(highlightParts("PATEL", "zzz")).toEqual([{ text: "PATEL", match: false }]);
  });
});
