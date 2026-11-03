"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

/**
 * Round profile photo of a Member; the initials are shown when there is no photo or it cannot be loaded.
 * `zoomable`: the photo is a button that opens it larger in a small dialog (same link, so the browser has it cached already). The click
 * does not reach the row / card the avatar sits in, so looking at a photo never picks the Member.
 */
export function MemberAvatar({ name, surname, photoUrl, zoomable = false }) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const initials = [name, surname].map((part) => (part ?? "").trim().charAt(0)).join("").toUpperCase();
  const fullName = [name, surname].map((part) => (part ?? "").trim()).filter(Boolean).join(" ");

  if (photoUrl && !failed) {
    const image = (
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
    if (!zoomable) return image;
    return (
      <>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          aria-label={`View photo of ${fullName}`}
          title="View photo"
          className="shrink-0 cursor-zoom-in rounded-full outline-offset-2 hover:opacity-90"
        >
          {image}
        </button>
        {open && (
          // `contents`: no box of its own in the row; it only stops clicks inside the dialog from reaching the row (a click there would pick the Member)
          <div className="contents" onClick={(event) => event.stopPropagation()}>
            <Modal title={fullName || "Photo"} narrow onClose={() => setOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the same external photo, larger */}
              <img src={photoUrl} alt={fullName ? `Photo of ${fullName}` : "Photo"} className="mx-auto max-h-[70dvh] w-full rounded-lg bg-surface-muted object-contain" />
            </Modal>
          </div>
        )}
      </>
    );
  }
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
      {initials}
    </span>
  );
}
