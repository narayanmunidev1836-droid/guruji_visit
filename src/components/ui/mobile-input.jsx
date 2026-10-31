"use client";

import { contactMobileInputValue, mobileInputValue } from "@/lib/normalize";
import { Input } from "@/components/ui/inputs";

/**
 * Mobile number box: digits only, at most 10 (also when pasted, e.g. "+91 98765 43210" becomes 9876543210).
 * `international` (a Member's mobile): a number starting with "+" and another country code is kept as "+14164143653" (up to 15 digits).
 */
export function MobileInput({ onChange, international = false, ...props }) {
  return (
    <Input
      type="text"
      inputMode={international ? "tel" : "numeric"}
      maxLength={international ? 16 : 10}
      autoComplete="off"
      {...props}
      onChange={(event) => {
        event.target.value = (international ? contactMobileInputValue : mobileInputValue)(event.target.value);
        onChange?.(event);
      }}
    />
  );
}
