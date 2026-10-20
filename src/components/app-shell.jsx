import { logoutAction } from "@/actions/auth";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { AppFrame } from "@/components/app-frame";

function buildNav(user) {
  const item = (href, icon, key, match) => {
    return { href, icon, primary: t(key), match };
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
      labels={{ account: t("account"), logout: t("logout"), more: "More" }}
      logoutAction={logoutAction}
    >
      {children}
    </AppFrame>
  );
}
