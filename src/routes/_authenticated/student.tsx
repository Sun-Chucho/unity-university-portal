import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BookPlus, FileText, Home, UserRound } from "lucide-react";
import { AppShell, type NavItem } from "@/components/portal";
import { requireRole } from "@/lib/session";

const NAV: NavItem[] = [
  { to: "/student", label: "Overview", icon: Home, exact: true },
  { to: "/student/register", label: "Course registration", icon: BookPlus },
  { to: "/student/results", label: "Results", icon: FileText },
  { to: "/student/profile", label: "Profile", icon: UserRound },
];

export const Route = createFileRoute("/_authenticated/student")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "student"),
  head: () => ({ meta: [{ title: "Student · Unity Portal" }] }),
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    return <AppShell me={me} nav={NAV}><Outlet /></AppShell>;
  },
});
