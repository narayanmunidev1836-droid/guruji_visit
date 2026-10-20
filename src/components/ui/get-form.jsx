"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Search-style form (GET): navigates with the router instead of a full page load, so the app shell, scroll position and
 * client state stay put. Empty fields are left out of the URL, which keeps it short and shareable. Still a real
 * <form action="..."> so it also works without JavaScript.
 */
export function GetForm({ action, children, ...props }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim() !== "") params.append(key, value.trim());
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `${action}?${query}` : action));
  }

  return (
    <form action={action} method="get" onSubmit={onSubmit} aria-busy={pending} {...props}>
      {children}
    </form>
  );
}
