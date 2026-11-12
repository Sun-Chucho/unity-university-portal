import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Activity, BarChart3, BookOpen, Building2, CalendarRange, ClipboardCheck, Home, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/portal";
import { requireRole } from "@/lib/session";

const NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: Home, exact: true },
  { to: "/admin/structure", label: "Faculties and departments", icon: Building2 },
  { to: "/admin/sessions", label: "Sessions", icon: CalendarRange },
  { to: "/admin/people", label: "Accounts and roles", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/approvals", label: "Result approvals", icon: ClipboardCheck },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/activity", label: "Activity log", icon: Activity },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "super_admin"),
  head: () => ({ meta: [{ title: "Registry · Unity Portal" }] }),
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    return <AppShell me={me} nav={NAV}><Outlet /></AppShell>;
  },
});
