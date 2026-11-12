import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { AppShell, type NavItem } from "@/components/portal";
import { requireRole } from "@/lib/session";

const NAV: NavItem[] = [{ to: "/lecturer", label: "My courses", icon: BookOpen }];

export const Route = createFileRoute("/_authenticated/lecturer")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "lecturer"),
  head: () => ({ meta: [{ title: "Lecturer · Unity Portal" }] }),
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    return <AppShell me={me} nav={NAV}><Outlet /></AppShell>;
  },
});
