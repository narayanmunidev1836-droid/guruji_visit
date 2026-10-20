// Relative path helpers shared by the web app and (by copy of the same rules) the local indexer.
// A photo location is always (hard disk, path relative to the disk root). Never an absolute path.

export const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

export class InvalidPathError extends Error {}

/**
 * Validates and normalizes a path that is relative to a disk root.
 * - converts "\" to "/" and collapses duplicate separators
 * - rejects absolute paths, drive letters, "..", NUL characters and empty results
 * The characters of file names are preserved exactly (no case or Unicode changes).
 */
export function normalizeRelativePath(input) {
  if (typeof input !== "string") throw new InvalidPathError("Path must be a string.");
  if (input.includes("\0")) throw new InvalidPathError("Path contains an invalid character.");
  const unified = input.replace(/\\/g, "/");
  if (unified.startsWith("/") || /^[A-Za-z]:/.test(unified)) {
    throw new InvalidPathError("Path must be relative to the disk root.");
  }
  const segments = [];
  for (const segment of unified.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") throw new InvalidPathError("Path must not contain '..'.");
    segments.push(segment);
  }
  if (segments.length === 0) throw new InvalidPathError("Path is empty.");
  return segments.join("/");
}

/** Same rules as normalizeRelativePath but an empty path (the disk root) is allowed. */
export function normalizeFolderPath(input) {
  if (input === null || input === undefined || String(input).trim() === "") return "";
  return normalizeRelativePath(String(input));
}

export function splitRelativePath(relativePath) {
  const index = relativePath.lastIndexOf("/");
  return {
    folderPath: index === -1 ? "" : relativePath.slice(0, index),
    fileName: index === -1 ? relativePath : relativePath.slice(index + 1),
  };
}

export function extensionOf(fileName) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index + 1).toLowerCase();
}

export function isSupportedImage(fileName) {
  return SUPPORTED_EXTENSIONS.includes(extensionOf(fileName));
}

/** The text staff copy to find a file: "<sticker label>/<relative path>". */
export function displayLocation(labelName, relativePath) {
  return `${labelName}/${relativePath}`;
}
