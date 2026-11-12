import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BarChart3, BookOpen, ClipboardCheck, Home, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/portal";
import { requireRole } from "@/lib/session";

const NAV: NavItem[] = [
  { to: "/department", label: "Overview", icon: Home, exact: true },
  { to: "/department/results", label: "Result approvals", icon: ClipboardCheck },
  { to: "/department/people", label: "Students and staff", icon: Users },
  { to: "/department/courses", label: "Courses and programs", icon: BookOpen },
  { to: "/department/reports", label: "Reports", icon: BarChart3 },
];

export const Route = createFileRoute("/_authenticated/department")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "dept_admin"),
  head: () => ({ meta: [{ title: "Department · Unity Portal" }] }),
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    return <AppShell me={me} nav={NAV}><Outlet /></AppShell>;
  },
});
