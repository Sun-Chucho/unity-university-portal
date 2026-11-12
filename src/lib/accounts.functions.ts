import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// Account creation needs the auth admin API, so it lives on the server.
// Every call checks who is asking before touching the admin client.

const accountInput = z.object({
  role: z.enum(["student", "lecturer", "dept_admin", "super_admin"]),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  department_id: z.string().uuid().nullable(),
  matric_no: z.string().trim().max(40).optional(),
  program_id: z.string().uuid().optional(),
  level: z.number().int().optional(),
  staff_no: z.string().trim().max(40).optional(),
  title: z.string().trim().max(20).optional(),
});

async function callerContext(supabase: SupabaseClient<Database>, userId: string) {
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("department_id, full_name").eq("id", userId).maybeSingle(),
  ]);
  const set = new Set((roles ?? []).map((r: { role: string }) => r.role));
  return {
    isSuper: set.has("super_admin"),
    isDeptAdmin: set.has("dept_admin"),
    department: profile?.department_id as string | null,
    name: profile?.full_name as string | undefined,
  };
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => accountInput.parse(d))
  .handler(async ({ data, context }) => {
    const me = await callerContext(context.supabase, context.userId);

    // Department admins only onboard students and lecturers into their own department.
    if (!me.isSuper) {
      if (!me.isDeptAdmin) throw new Error("You are not allowed to create accounts");
      if (data.role !== "student" && data.role !== "lecturer") throw new Error("Department admins can only add students and lecturers");
      if (data.department_id !== me.department) throw new Error("You can only add people to your own department");
    }
    if (data.role === "student" && (!data.matric_no || !data.program_id || !data.level)) {
      throw new Error("Students need a matric number, program and level");
    }
    if (data.role === "lecturer" && !data.staff_no) throw new Error("Lecturers need a staff number");
    if (data.role !== "super_admin" && !data.department_id) throw new Error("Pick a department");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const created = await provisionUser(supabaseAdmin, data);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_name: me.name,
      action: "create_account",
      entity: "user",
      entity_id: created,
      department_id: data.department_id,
      details: { role: data.role, email: data.email },
    });
    return { id: created };
  });

type Provision = z.infer<typeof accountInput>;

async function provisionUser(admin: SupabaseClient<Database>, d: Provision): Promise<string> {
  const { data: made, error } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { full_name: d.full_name },
  });
  if (error) throw new Error(error.message);
  const id = made.user.id as string;

  // If any follow up insert fails we remove the half built user so the email can be reused.
  try {
    await must(admin.from("profiles").insert({ id, full_name: d.full_name, email: d.email, department_id: d.department_id }));
    await must(admin.from("user_roles").insert({ user_id: id, role: d.role }));
    if (d.role === "student") {
      if (!d.matric_no || !d.program_id || !d.level) throw new Error("Student details are required");
      await must(admin.from("students").insert({ id, matric_no: d.matric_no, program_id: d.program_id, level: d.level }));
    }
    if (d.role === "lecturer") {
      if (!d.staff_no) throw new Error("Lecturer staff number is required");
      await must(admin.from("lecturers").insert({ id, staff_no: d.staff_no, title: d.title || "Dr." }));
    }
  } catch (e) {
    await admin.auth.admin.deleteUser(id);
    throw e;
  }
  return id;
}

async function must(q: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), status: z.enum(["active", "suspended", "deactivated"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await callerContext(context.supabase, context.userId);
    if (!me.isSuper) throw new Error("Only the super admin can change account status");
    if (data.user_id === context.userId) throw new Error("You cannot change your own status");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A ban blocks sign in and token refresh, so suspension takes effect for real.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.status === "active" ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    await must(supabaseAdmin.from("profiles").update({ status: data.status }).eq("id", data.user_id));
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_name: me.name,
      action: `status_${data.status}`,
      entity: "user",
      entity_id: data.user_id,
      details: {},
    });
    return { ok: true };
  });
