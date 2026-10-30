"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Search-style form (GET): navigates with the router instead of a full page load, so the app shell, scroll position and
 * client state stay put. Empty fields are left out of the URL, which keeps it short and shareable. Still a real
 * <form action="..."> so it also works without JavaScript.
 * Live search: a <DebounceInput submitOnChange> inside submits the form while typing; such programmatic submits
 * replace the history entry instead of adding one per pause. A reset button clears every field and searches again.
 */
export function GetForm({ action, children, ...props }) {
  const router = useRouter();
  const form = useRef(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim() !== "") params.append(key, value.trim());
    }
    const query = params.toString();
    const url = query ? `${action}?${query}` : action;
    const live = !event.nativeEvent.submitter; // requestSubmit() from a debounced input, not a click / Enter
    // a click / Enter on Search folds the filters panel away so the results get the room
    if (!live) for (const details of event.currentTarget.querySelectorAll("details[open]")) details.open = false;
    startTransition(() => (live ? router.replace(url) : router.push(url)));
  }

  function onReset() {
    // The native reset restores the initial values; we want blank fields, so clear them and search again.
    setTimeout(() => {
      const element = form.current;
      if (!element) return;
      for (const details of element.querySelectorAll("details[open]")) details.open = false;
      for (const field of element.elements) {
        if (["submit", "reset", "button"].includes(field.type)) continue;
        if (field.tagName === "SELECT") field.selectedIndex = 0;
        else field.value = "";
      }
      element.requestSubmit();
    }, 0);
  }

  return (
    <form ref={form} action={action} method="get" onSubmit={onSubmit} onReset={onReset} aria-busy={pending} {...props}>
      {children}
    </form>
  );
}
