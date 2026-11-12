import { queryOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "student" | "lecturer" | "dept_admin" | "super_admin";

export const ROLE_HOME = {
  super_admin: "/admin",
  dept_admin: "/department",
  lecturer: "/lecturer",
  student: "/student",
} as const;

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  dept_admin: "Department Admin",
  lecturer: "Lecturer",
  student: "Student",
};

const PRIORITY: Role[] = ["super_admin", "dept_admin", "lecturer", "student"];

async function loadMe() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    supabase.from("profiles").select("*, departments(name, code)").eq("id", data.user.id).maybeSingle(),
  ]);
  const list = (roles ?? []).map((r) => r.role as Role);
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    roles: list,
    primary: PRIORITY.find((r) => list.includes(r)) ?? null,
    profile,
  };
}

export type Me = NonNullable<Awaited<ReturnType<typeof loadMe>>>;

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: loadMe, staleTime: 60_000 });

// Used by each role area. The database still enforces everything; this just keeps people
// from landing on screens that would come back empty or forbidden.
export async function requireRole(queryClient: QueryClient, role: Role) {
  const me = await queryClient.ensureQueryData(meQuery);
  if (!me) throw redirect({ to: "/auth" });
  if (me.profile?.status && me.profile.status !== "active") {
    await supabase.auth.signOut();
    throw redirect({ to: "/auth" });
  }
  if (!me.roles.includes(role)) throw redirect({ to: "/dashboard" });
  return { me };
}

// Supabase errors come back as objects; this keeps toasts readable.
export function errorText(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}
