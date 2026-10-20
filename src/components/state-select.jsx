"use client";

import { useEffect, useRef, useState } from "react";
import { listStatesAction } from "@/actions/haribhagats";
import { countryOptions } from "@/lib/countries";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SuggestInput } from "@/components/ui/suggest-input";

/**
 * State box that follows the chosen country: a searchable dropdown of that country's states (free CountriesNow API).
 * When the list is not available (unknown country name, API down, nothing chosen yet) it is a normal text box with
 * suggestions from the saved Haribhagats, so the field always works.
 * Controlled: `country` and `value` are the CAPITAL values stored in the database; `onChange(value)`.
 */
export function StateSelect({ name = "state", country, countries = [], value, onChange, disabled = false, placeholder = "Type or pick a state", maxLength = 100 }) {
  const [loaded, setLoaded] = useState({ country: "", states: [] });
  const requestId = useRef(0);
  const label = countries.find((entry) => entry.toLocaleUpperCase("en-US") === country) ?? "";

  useEffect(() => {
    if (!label || disabled) return;
    const current = ++requestId.current;
    listStatesAction(label).then((states) => {
      if (current === requestId.current) setLoaded({ country, states });
    });
  }, [label, country, disabled]);

  const states = loaded.country === country && !disabled ? loaded.states : [];

  if (states.length > 0) {
    return <SearchableSelect name={name} value={value} onChange={onChange} placeholder="Search or select a state" options={countryOptions(states, value)} />;
  }
  return (
    <SuggestInput
      name={name}
      field="state"
      context={{ country }}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onPick={onChange}
      readOnly={disabled}
      maxLength={maxLength}
      placeholder={disabled ? undefined : placeholder}
    />
  );
}
