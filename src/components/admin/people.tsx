import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Empty, Panel, StatusPill, td } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, setAccountStatus } from "@/lib/accounts.functions";
import { departmentsQuery, programsQuery } from "@/lib/queries";
import { errorText, ROLE_LABEL, type Role } from "@/lib/session";

const LEVELS = [100, 200, 300, 400, 500];

// Lists and manages accounts. Pass a department to scope it for a department admin.
export function PeopleManager({ departmentId, superAdmin = false }: { departmentId?: string | null; superAdmin?: boolean }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | Role>("all");
  const [q, setQ] = useState("");

  const { data: people = [] } = useQuery({
    queryKey: ["people", departmentId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, full_name, email, status, department_id, departments(code), students(matric_no, level), lecturers(staff_no)").order("full_name");
      if (departmentId) query = query.eq("department_id", departmentId);
      const [{ data, error }, { data: roles }] = await Promise.all([query, supabase.from("user_roles").select("user_id, role")]);
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role) }));
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["people"] });

  const status = useMutation({
    mutationFn: (v: { user_id: string; status: "active" | "suspended" | "deactivated" }) => setAccountStatus({ data: v }),
    onSuccess: () => { toast.success("Account updated"); refresh(); },
    onError: (e) => toast.error(errorText(e)),
  });

  const level = useMutation({
    mutationFn: async (v: { id: string; level: number }) => {
      const { error } = await supabase.from("students").update({ level: v.level }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Level updated"); refresh(); },
    onError: (e) => toast.error(errorText(e)),
  });

  const role = useMutation({
    mutationFn: async (v: { user_id: string; role: Role; grant: boolean }) => {
      const { error } = v.grant
        ? await supabase.from("user_roles").insert({ user_id: v.user_id, role: v.role })
        : await supabase.from("user_roles").delete().eq("user_id", v.user_id).eq("role", v.role);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Roles updated"); refresh(); },
    onError: (e) => toast.error(errorText(e)),
  });

  const term = q.trim().toLowerCase();
  const shown = people.filter(
    (p) => (filter === "all" || p.roles.includes(filter)) && (!term || `${p.full_name} ${p.email} ${p.students?.matric_no ?? ""}`.toLowerCase().includes(term)),
  );

  return (
    <Panel
      title="People"
      action={<CreateAccount departmentId={departmentId} superAdmin={superAdmin} onDone={refresh} />}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, email or matric" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-full pl-9" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(["all", "student", "lecturer", ...(superAdmin ? ["dept_admin", "super_admin"] : [])] as const).map((r) => (
            <button key={r} onClick={() => setFilter(r as typeof filter)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {r === "all" ? "Everyone" : ROLE_LABEL[r as Role]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty>No one matches.</Empty>
      ) : (
        <DataTable head={["Name", "Role", "Dept", "ID", "Level", "Status"]}>
          {shown.map((p) => (
            <tr key={p.id}>
              <td className={td}>
                <p className="font-medium">{p.full_name}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
              </td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {p.roles.map((r) => (
                    <span key={r} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                      {ROLE_LABEL[r]}
                      {superAdmin && p.roles.length > 1 && (
                        <button className="ml-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${ROLE_LABEL[r]}`} onClick={() => role.mutate({ user_id: p.id, role: r, grant: false })}>×</button>
                      )}
                    </span>
                  ))}
                  {superAdmin && p.roles.includes("lecturer") && !p.roles.includes("dept_admin") && (
                    <button className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-primary" onClick={() => role.mutate({ user_id: p.id, role: "dept_admin", grant: true })}>+ Dept admin</button>
                  )}
                </div>
              </td>
              <td className={td}>{p.departments?.code ?? "-"}</td>
              <td className={`${td} text-muted-foreground`}>{p.students?.matric_no ?? p.lecturers?.staff_no ?? "-"}</td>
              <td className={td}>
                {p.students ? (
                  <select value={p.students.level} onChange={(e) => level.mutate({ id: p.id, level: Number(e.target.value) })} className="rounded-lg border border-input bg-background px-2 py-1 text-sm">
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                ) : "-"}
              </td>
              <td className={td}>
                {superAdmin ? (
                  <select value={p.status} onChange={(e) => status.mutate({ user_id: p.id, status: e.target.value as "active" })} className="rounded-lg border border-input bg-background px-2 py-1 text-sm capitalize">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                ) : (
                  <StatusPill status={p.status} />
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </Panel>
  );
}

function CreateAccount({ departmentId, superAdmin, onDone }: { departmentId?: string | null; superAdmin: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: depts = [] } = useQuery(departmentsQuery);
  const { data: programs = [] } = useQuery(programsQuery);
  const blank = { role: "student" as Role, full_name: "", email: "", password: "", department_id: departmentId ?? "", matric_no: "", program_id: "", level: 100, staff_no: "", title: "Dr." };
  const [f, setF] = useState(blank);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: () =>
      createAccount({
        data: {
          role: f.role,
          full_name: f.full_name,
          email: f.email,
          password: f.password,
          department_id: f.role === "super_admin" ? null : f.department_id || null,
          ...(f.role === "student" ? { matric_no: f.matric_no, program_id: f.program_id, level: f.level } : {}),
          ...(f.role === "lecturer" ? { staff_no: f.staff_no, title: f.title } : {}),
        },
      }),
    onSuccess: () => { toast.success("Account created"); setOpen(false); setF(blank); onDone(); },
    onError: (e) => toast.error(errorText(e)),
  });

  const roles: Role[] = superAdmin ? ["student", "lecturer", "dept_admin", "super_admin"] : ["student", "lecturer"];
  const deptPrograms = programs.filter((p) => p.department_id === f.department_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus /> Add person</Button></DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader><DialogTitle>New account</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="grid gap-3 sm:grid-cols-2">
          <Field label="Role" full>
            <Select value={f.role} onValueChange={(v) => set("role", v as Role)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Full name" full><Input required value={f.full_name} onChange={(e) => set("full_name", e.target.value)} className="rounded-xl" /></Field>
          <Field label="Email"><Input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className="rounded-xl" /></Field>
          <Field label="Temporary password"><Input required minLength={8} value={f.password} onChange={(e) => set("password", e.target.value)} className="rounded-xl" /></Field>
          {f.role !== "super_admin" && (
            <Field label="Department" full>
              <Select value={f.department_id} onValueChange={(v) => set("department_id", v)} disabled={!!departmentId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          {f.role === "student" && (
            <>
              <Field label="Matric number"><Input required value={f.matric_no} onChange={(e) => set("matric_no", e.target.value)} className="rounded-xl" /></Field>
              <Field label="Level">
                <Select value={String(f.level)} onValueChange={(v) => set("level", Number(v))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Program" full>
                <Select value={f.program_id} onValueChange={(v) => set("program_id", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{deptPrograms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </>
          )}
          {f.role === "lecturer" && (
            <>
              <Field label="Staff number"><Input required value={f.staff_no} onChange={(e) => set("staff_no", e.target.value)} className="rounded-xl" /></Field>
              <Field label="Title"><Input value={f.title} onChange={(e) => set("title", e.target.value)} className="rounded-xl" /></Field>
            </>
          )}
          <Button type="submit" variant="hero" className="sm:col-span-2" disabled={create.isPending}>Create account</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}
