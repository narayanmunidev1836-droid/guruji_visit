"use client";

import { useState } from "react";

/** Round profile photo of a Member; the initials are shown when there is no photo or it cannot be loaded. */
export function MemberAvatar({ name, surname, photoUrl }) {
  const [failed, setFailed] = useState(false);
  const initials = [name, surname].map((part) => (part ?? "").trim().charAt(0)).join("").toUpperCase();

  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- an external photo, shown as it is (no optimisation / proxy)
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full border border-border bg-surface-muted object-cover"
      />
    );
  }
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
      {initials}
    </span>
  );
}
