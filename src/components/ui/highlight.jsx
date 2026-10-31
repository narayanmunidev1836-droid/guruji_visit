import { highlightParts } from "@/lib/highlight";

/** `text` with the words of the search `query` marked (any case): shows the user which part of a result matched what they typed. */
export function Highlight({ text, query }) {
  return (
    <>
      {highlightParts(text, query).map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-sm bg-warning/25 px-0.5 font-semibold text-inherit">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
