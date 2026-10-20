import { logoutAction } from "@/actions/auth";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/permissions";
import { tPair } from "@/lib/labels";
import { AppFrame } from "@/components/app-frame";

function buildNav(user) {
  const item = (href, icon, key, match) => {
    const [primary] = tPair(key); // sidebar is English only (no Gujarati secondary line)
    return { href, icon, primary, match };
  };
  const nav = [
    item("/dashboard", "LayoutDashboard", "dashboard", "exact"),
    item("/search", "Search", "search", "exact"),
    item("/visits", "CalendarDays", "visits"),
    item("/haribhagats", "Users", "haribhagats"),
    item("/events", "Tags", "events"),
    item("/hard-disks", "HardDrive", "hardDisks"),
  ];
  if (isAdmin(user)) {
    nav.push(item("/users", "UserCog", "users"), item("/settings", "Settings", "settings"));
  }
  return nav;
}

/** Server component: verifies the session (redirects to /login if invalid) and renders the frame. */
export async function AppShell({ children }) {
  const user = await requireUser();

  return (
    <AppFrame
      nav={buildNav(user)}
      user={{ name: user.name, roleLabel: user.role === "ADMIN" ? "Admin" : "Staff" }}
      labels={{ account: tPair("account")[0], logout: tPair("logout")[0], more: "More" }}
      logoutAction={logoutAction}
    >
      {children}
    </AppFrame>
  );
}
