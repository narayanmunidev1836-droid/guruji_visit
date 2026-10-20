import { describe, expect, it } from "vitest";
import {
  InvalidPathError,
  displayLocation,
  extensionOf,
  isSupportedImage,
  normalizeFolderPath,
  normalizeRelativePath,
  splitRelativePath,
} from "@/lib/paths";

describe("normalizeRelativePath", () => {
  it("converts Windows separators and collapses duplicates", () => {
    expect(normalizeRelativePath("2019\\March\\\\Patel Home\\IMG_0001.jpg")).toBe("2019/March/Patel Home/IMG_0001.jpg");
  });

  it("drops '.' segments and leading './'", () => {
    expect(normalizeRelativePath("./2019/./March/a.jpg")).toBe("2019/March/a.jpg");
  });

  it("preserves file names exactly (case and Unicode)", () => {
    expect(normalizeRelativePath("૨૦૧૯/Mixed Case/IMG.JPG")).toBe("૨૦૧૯/Mixed Case/IMG.JPG");
  });

  it.each(["../secret.jpg", "a/../../b.jpg", "a/..", ".."])("rejects traversal: %s", (input) => {
    expect(() => normalizeRelativePath(input)).toThrow(InvalidPathError);
  });

  it.each(["/etc/passwd", "\\Windows\\win.ini", "C:\\Users\\me\\a.jpg", "c:/a.jpg"])("rejects absolute paths: %s", (input) => {
    expect(() => normalizeRelativePath(input)).toThrow(InvalidPathError);
  });

  it("rejects NUL characters, empty paths and non-strings", () => {
    expect(() => normalizeRelativePath("a\0b.jpg")).toThrow(InvalidPathError);
    expect(() => normalizeRelativePath("")).toThrow(InvalidPathError);
    expect(() => normalizeRelativePath("///")).toThrow(InvalidPathError);
    expect(() => normalizeRelativePath(null)).toThrow(InvalidPathError);
  });
});

describe("normalizeFolderPath", () => {
  it("allows the disk root", () => {
    expect(normalizeFolderPath("")).toBe("");
    expect(normalizeFolderPath("   ")).toBe("");
    expect(normalizeFolderPath(null)).toBe("");
  });
  it("normalizes real folders and still rejects traversal", () => {
    expect(normalizeFolderPath("2019\\March")).toBe("2019/March");
    expect(() => normalizeFolderPath("../x")).toThrow(InvalidPathError);
  });
});

describe("helpers", () => {
  it("splits folder and file name", () => {
    expect(splitRelativePath("a/b/c.jpg")).toEqual({ folderPath: "a/b", fileName: "c.jpg" });
    expect(splitRelativePath("c.jpg")).toEqual({ folderPath: "", fileName: "c.jpg" });
  });
  it("recognises supported image types case-insensitively", () => {
    for (const name of ["a.jpg", "a.JPEG", "a.png", "a.WebP", "a.heic"]) expect(isSupportedImage(name)).toBe(true);
    for (const name of ["a.gif", "a.mp4", "a.txt", "a", ".jpg.bak"]) expect(isSupportedImage(name)).toBe(false);
    expect(extensionOf("x.tar.GZ")).toBe("gz");
  });
  it("shows 'label/path' for copying", () => {
    expect(displayLocation("HDD-001", "2019/a.jpg")).toBe("HDD-001/2019/a.jpg");
  });
});
