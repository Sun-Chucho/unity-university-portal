import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable, Empty, Panel, td } from "@/components/portal";
import { Field } from "@/components/admin/people";
import { supabase } from "@/integrations/supabase/client";
import { currentSemesterQuery, departmentsQuery, programsQuery } from "@/lib/queries";
import { errorText } from "@/lib/session";

const sel = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

// Courses, plus who teaches each one this semester.
export function CoursesManager({ departmentId }: { departmentId?: string | null }) {
  const qc = useQueryClient();
  const { data: sem } = useQuery(currentSemesterQuery);
  const { data: depts = [] } = useQuery(departmentsQuery);

  const { data } = useQuery({
    enabled: !!sem,
    queryKey: ["courses-admin", departmentId ?? "all", sem?.id],
    queryFn: async () => {
      let cq = supabase.from("courses").select("*, departments(code)").order("code");
      if (departmentId) cq = cq.eq("department_id", departmentId);
      const [{ data: courses, error }, { data: allocs }, { data: lecturers }, { data: regs }] = await Promise.all([
        cq,
        supabase.from("course_allocations").select("id, course_id, lecturer_id").eq("semester_id", sem!.id),
        supabase.from("lecturers").select("id, title, profiles(full_name, department_id)"),
        supabase.from("registrations").select("course_id").eq("semester_id", sem!.id),
      ]);
      if (error) throw error;
      return { courses: courses ?? [], allocs: allocs ?? [], lecturers: lecturers ?? [], regs: regs ?? [] };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["courses-admin"] });

  const allocate = useMutation({
    mutationFn: async (v: { course_id: string; lecturer_id: string }) => {
      const { error } = v.lecturer_id
        ? await supabase.from("course_allocations").upsert({ course_id: v.course_id, lecturer_id: v.lecturer_id, semester_id: sem!.id }, { onConflict: "course_id,semester_id" })
        : await supabase.from("course_allocations").delete().eq("course_id", v.course_id).eq("semester_id", sem!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Allocation saved"); refresh(); },
    onError: (e) => toast.error(errorText(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw new Error(error.code === "23503" ? "This course has registrations, so it cannot be deleted" : error.message);
    },
    onSuccess: () => { toast.success("Course removed"); refresh(); },
    onError: (e) => toast.error(errorText(e)),
  });

  const courses = data?.courses ?? [];

  return (
    <Panel title="Courses" action={<NewCourse departmentId={departmentId} depts={depts} onDone={refresh} />}>
      {courses.length === 0 ? (
        <Empty>No courses yet.</Empty>
      ) : (
        <DataTable head={["Code", "Title", "Units", "Level", "Term", "Students", "Lecturer this semester", ""]}>
          {courses.map((c) => {
            const current = data?.allocs.find((a) => a.course_id === c.id);
            const pool = data?.lecturers.filter((l) => l.profiles?.department_id === c.department_id) ?? [];
            const offeredNow = c.term === sem?.term;
            return (
              <tr key={c.id}>
                <td className={`${td} font-medium`}>{c.code}{!departmentId && <span className="ml-1 text-xs text-muted-foreground">{c.departments?.code}</span>}</td>
                <td className={td}>{c.title}</td>
                <td className={td}>{c.units}</td>
                <td className={td}>{c.level}</td>
                <td className={`${td} capitalize`}>{c.term}</td>
                <td className={td}>{data?.regs.filter((r) => r.course_id === c.id).length ?? 0}</td>
                <td className={td}>
                  {offeredNow ? (
                    <select value={current?.lecturer_id ?? ""} onChange={(e) => allocate.mutate({ course_id: c.id, lecturer_id: e.target.value })} className="rounded-lg border border-input bg-background px-2 py-1 text-sm">
                      <option value="">Unassigned</option>
                      {pool.map((l) => <option key={l.id} value={l.id}>{l.title} {l.profiles?.full_name}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not offered this term</span>
                  )}
                </td>
                <td className={td}>
                  <button onClick={() => confirm(`Delete ${c.code}?`) && remove.mutate(c.id)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Delete ${c.code}`}><Trash2 className="size-4" /></button>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </Panel>
  );
}

function NewCourse({ departmentId, depts, onDone }: { departmentId?: string | null; depts: Array<{ id: string; name: string }>; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: programs = [] } = useQuery(programsQuery);
  const blank = { code: "", title: "", units: 3, level: 100, term: "first" as "first" | "second", department_id: departmentId ?? "", program_id: "" };
  const [f, setF] = useState(blank);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").insert({ ...f, code: f.code.trim().toUpperCase().replace(/\s+/g, ""), title: f.title.trim(), program_id: f.program_id || null });
      if (error) throw new Error(error.code === "23505" ? "That course code already exists" : error.message);
    },
    onSuccess: () => { toast.success("Course created"); setOpen(false); setF(blank); onDone(); },
    onError: (e) => toast.error(errorText(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus /> New course</Button></DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-3 sm:grid-cols-2">
          <Field label="Code"><Input required maxLength={10} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="rounded-xl" /></Field>
          <Field label="Units"><Input type="number" min={1} max={6} value={f.units} onChange={(e) => setF({ ...f, units: Number(e.target.value) })} className="rounded-xl" /></Field>
          <Field label="Title" full><Input required maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="rounded-xl" /></Field>
          <Field label="Level">
            <select className={sel} value={f.level} onChange={(e) => setF({ ...f, level: Number(e.target.value) })}>{[100, 200, 300, 400, 500].map((l) => <option key={l}>{l}</option>)}</select>
          </Field>
          <Field label="Semester">
            <select className={sel} value={f.term} onChange={(e) => setF({ ...f, term: e.target.value as "first" })}><option value="first">First</option><option value="second">Second</option></select>
          </Field>
          {!departmentId && (
            <Field label="Department" full>
              <select required className={sel} value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value, program_id: "" })}>
                <option value="">Choose</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Program (optional, leave blank for all)" full>
            <select className={sel} value={f.program_id} onChange={(e) => setF({ ...f, program_id: e.target.value })}>
              <option value="">All programs in department</option>
              {programs.filter((p) => p.department_id === f.department_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Button type="submit" variant="hero" className="sm:col-span-2" disabled={save.isPending}>Create course</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
