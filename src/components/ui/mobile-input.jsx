"use client";

import { mobileInputValue } from "@/lib/normalize";
import { Input } from "@/components/ui/inputs";

/** Mobile number box: digits only, at most 10 (also when pasted, e.g. "+91 98765 43210" becomes 9876543210). */
export function MobileInput({ onChange, ...props }) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      maxLength={10}
      autoComplete="off"
      {...props}
      onChange={(event) => {
        event.target.value = mobileInputValue(event.target.value);
        onChange?.(event);
      }}
    />
  );
}
