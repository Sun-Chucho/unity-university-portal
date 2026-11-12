import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DataTable, Empty, Panel, td } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { departmentsQuery, programsQuery, termLabel } from "@/lib/queries";
import { errorText } from "@/lib/session";

const sel = "rounded-xl border border-input bg-background px-3 py-2 text-sm";

function useAction<T>(fn: (v: T) => PromiseLike<{ error: { message: string; code?: string } | null }>, keys: string[][], ok: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: T) => {
      const { error } = await fn(v);
      if (error) throw new Error(error.code === "23505" ? "That name or code is already taken" : error.code === "23503" ? "Still in use elsewhere, so it cannot be removed" : error.message);
    },
    onSuccess: () => { toast.success(ok); keys.forEach((k) => qc.invalidateQueries({ queryKey: k })); },
    onError: (e) => toast.error(errorText(e)),
  });
}

export function FacultiesAndDepartments() {
  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties"],
    queryFn: async () => (await supabase.from("faculties").select("*").order("name")).data ?? [],
  });
  const { data: depts = [] } = useQuery(departmentsQuery);
  const [fac, setFac] = useState({ name: "", code: "" });
  const [dep, setDep] = useState({ name: "", code: "", faculty_id: "" });

  const addFac = useAction((v: typeof fac) => supabase.from("faculties").insert({ name: v.name.trim(), code: v.code.trim().toUpperCase() }), [["faculties"]], "Faculty added");
  const addDep = useAction((v: typeof dep) => supabase.from("departments").insert({ name: v.name.trim(), code: v.code.trim().toUpperCase(), faculty_id: v.faculty_id }), [["departments"]], "Department added");
  const delFac = useAction((id: string) => supabase.from("faculties").delete().eq("id", id), [["faculties"]], "Faculty removed");
  const delDep = useAction((id: string) => supabase.from("departments").delete().eq("id", id), [["departments"]], "Department removed");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Faculties">
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); addFac.mutate(fac, { onSuccess: () => setFac({ name: "", code: "" }) }); }}>
          <Input required placeholder="Faculty name" value={fac.name} onChange={(e) => setFac({ ...fac, name: e.target.value })} className="rounded-xl" />
          <Input required placeholder="Code" maxLength={8} value={fac.code} onChange={(e) => setFac({ ...fac, code: e.target.value })} className="w-24 rounded-xl" />
          <Button size="icon" aria-label="Add faculty"><Plus /></Button>
        </form>
        <ul className="divide-y divide-border">
          {faculties.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-3 text-sm">
              <span><span className="font-medium">{f.name}</span> <span className="text-muted-foreground">{f.code}</span></span>
              <span className="flex items-center gap-3 text-muted-foreground">
                {depts.filter((d) => d.faculty_id === f.id).length} depts
                <button onClick={() => confirm(`Remove ${f.name}?`) && delFac.mutate(f.id)} aria-label="Remove" className="hover:text-destructive"><Trash2 className="size-4" /></button>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Departments">
        <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_6rem]" onSubmit={(e) => { e.preventDefault(); addDep.mutate(dep, { onSuccess: () => setDep({ name: "", code: "", faculty_id: dep.faculty_id }) }); }}>
          <Input required placeholder="Department name" value={dep.name} onChange={(e) => setDep({ ...dep, name: e.target.value })} className="rounded-xl" />
          <Input required placeholder="Code" maxLength={8} value={dep.code} onChange={(e) => setDep({ ...dep, code: e.target.value })} className="rounded-xl" />
          <select required className={sel} value={dep.faculty_id} onChange={(e) => setDep({ ...dep, faculty_id: e.target.value })}>
            <option value="">Faculty</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Button>Add</Button>
        </form>
        <ul className="divide-y divide-border">
          {depts.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-3 text-sm">
              <span><span className="font-medium">{d.name}</span> <span className="text-muted-foreground">{d.code} · {d.faculties?.name}</span></span>
              <button onClick={() => confirm(`Remove ${d.name}?`) && delDep.mutate(d.id)} aria-label="Remove" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export function ProgramsManager({ departmentId }: { departmentId?: string | null }) {
  const { data: programs = [] } = useQuery(programsQuery);
  const { data: depts = [] } = useQuery(departmentsQuery);
  const [f, setF] = useState({ name: "", code: "", duration_years: 4, department_id: departmentId ?? "" });
  const add = useAction((v: typeof f) => supabase.from("programs").insert({ ...v, name: v.name.trim(), code: v.code.trim().toUpperCase() }), [["programs"]], "Program added");
  const del = useAction((id: string) => supabase.from("programs").delete().eq("id", id), [["programs"]], "Program removed");
  const shown = programs.filter((p) => !departmentId || p.department_id === departmentId);

  return (
    <Panel title="Programs">
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(f, { onSuccess: () => setF({ ...f, name: "", code: "" }) }); }}>
        <Input required placeholder="Program name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="min-w-48 flex-1 rounded-xl" />
        <Input required placeholder="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="w-28 rounded-xl" />
        <Input type="number" min={1} max={7} value={f.duration_years} onChange={(e) => setF({ ...f, duration_years: Number(e.target.value) })} className="w-20 rounded-xl" aria-label="Years" />
        {!departmentId && (
          <select required className={sel} value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}>
            <option value="">Department</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <Button>Add</Button>
      </form>
      {shown.length === 0 ? <Empty>No programs yet.</Empty> : (
        <DataTable head={["Program", "Code", "Years", "Department", ""]}>
          {shown.map((p) => (
            <tr key={p.id}>
              <td className={`${td} font-medium`}>{p.name}</td>
              <td className={td}>{p.code}</td>
              <td className={td}>{p.duration_years}</td>
              <td className={td}>{depts.find((d) => d.id === p.department_id)?.code}</td>
              <td className={td}><button onClick={() => confirm(`Remove ${p.name}?`) && del.mutate(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="size-4" /></button></td>
            </tr>
          ))}
        </DataTable>
      )}
    </Panel>
  );
}

export function SessionsManager() {
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await supabase.from("academic_sessions").select("*, semesters(*)").order("name", { ascending: false })).data ?? [],
  });
  const [name, setName] = useState("");
  const keys = [["sessions"], ["semester"]];

  const add = useAction(async (n: string) => {
    const { data, error } = await supabase.from("academic_sessions").insert({ name: n.trim() }).select("id").single();
    if (error) return { error };
    return supabase.from("semesters").insert([{ session_id: data.id, term: "first" }, { session_id: data.id, term: "second" }]);
  }, keys, "Session created with two semesters");

  // Only one semester may be current, so clear the old one first.
  const makeCurrent = useAction(async (v: { semester: string; session: string }) => {
    let r = await supabase.from("semesters").update({ is_current: false }).eq("is_current", true);
    if (r.error) return r;
    r = await supabase.from("academic_sessions").update({ is_current: false }).eq("is_current", true);
    if (r.error) return r;
    r = await supabase.from("academic_sessions").update({ is_current: true }).eq("id", v.session);
    if (r.error) return r;
    return supabase.from("semesters").update({ is_current: true }).eq("id", v.semester);
  }, keys, "Current semester changed");

  const toggleReg = useAction((v: { id: string; open: boolean }) => supabase.from("semesters").update({ registration_open: v.open }).eq("id", v.id), keys, "Registration updated");

  return (
    <Panel title="Sessions and semesters">
      <form className="mb-6 flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); if (!/^\d{4}\/\d{4}$/.test(name.trim())) return toast.error("Use the format 2026/2027"); add.mutate(name, { onSuccess: () => setName("") }); }}>
        <Input placeholder="2026/2027" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
        <Button>Create</Button>
      </form>
      <div className="space-y-4">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border p-4">
            <p className="font-semibold">{s.name} {s.is_current && <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Current</span>}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[...(s.semesters ?? [])].sort((a, b) => a.term.localeCompare(b.term)).map((sem) => (
                <div key={sem.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
                  <span>{termLabel(sem.term)}</span>
                  <span className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Registration <Switch checked={sem.registration_open} onCheckedChange={(open) => toggleReg.mutate({ id: sem.id, open })} />
                    </label>
                    {sem.is_current ? (
                      <span className="text-xs font-medium text-primary">Active</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => makeCurrent.mutate({ semester: sem.id, session: s.id })}>Make current</Button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
