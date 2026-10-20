"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/inputs";

/**
 * Text input for search boxes: the typed text shows immediately, but the work (a search request, a URL change) only
 * happens after the user pauses typing for `delay` ms.
 *  - `onDebouncedChange(value)` is called with the settled text (not for the first render).
 *  - `submitOnChange` submits the surrounding form instead (live search for GET search forms).
 * Uncontrolled: give it `defaultValue`, and change its `key` to clear it from the outside. A form reset clears it too.
 */
export function DebounceInput({ onDebouncedChange, submitOnChange = false, delay = 350, defaultValue = "", onChange, ...props }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const input = useRef(null);
  const skip = useRef(true); // no callback for the initial value / a reset
  const latest = useRef({ onDebouncedChange, submitOnChange });

  useEffect(() => {
    latest.current = { onDebouncedChange, submitOnChange };
  });

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      latest.current.onDebouncedChange?.(value);
      if (latest.current.submitOnChange) input.current?.form?.requestSubmit();
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  useEffect(() => {
    const form = input.current?.form;
    if (!form) return undefined;
    const onReset = () => {
      skip.current = true; // the form handles the reset itself
      setValue("");
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  return (
    <Input
      {...props}
      ref={input}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onChange?.(event);
      }}
    />
  );
}
