import { redirect } from "next/navigation";

// The proxy sends anonymous visitors to /login; signed-in users land on the dashboard.
export default function Home() {
  redirect("/dashboard");
}
