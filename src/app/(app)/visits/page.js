import { redirect } from "next/navigation";

// There is no separate list of entries any more: everything is found (and edited / deleted) from Search.
export default function VisitsPage() {
  redirect("/search");
}
