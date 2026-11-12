import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Empty, PageHeader, Panel, td } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { errorText } from "@/lib/session";
import { currentSemesterQuery, myRegistrationsQuery, studentQuery, termLabel } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/register")({
  component: Register,
});

function Register() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: student } = useQuery(studentQuery(me.id));
  const { data: sem } = useQuery(currentSemesterQuery);
  const { data: regs = [] } = useQuery(myRegistrationsQuery(me.id));
  const [picked, setPicked] = useState<string[]>([]);

  // Only show what the database would accept anyway: same department, level and term.
  const { data: offered = [] } = useQuery({
    enabled: !!student && !!sem,
    queryKey: ["offered", student?.id, sem?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, units, program_id")
        .eq("department_id", student!.programs!.department_id)
        .eq("level", student!.level)
        .eq("term", sem!.term)
        .order("code");
      if (error) throw error;
      return (data ?? []).filter((c) => !c.program_id || c.program_id === student!.program_id);
    },
  });

  const current = regs.filter((r) => r.semester_id === sem?.id);
  const taken = new Set(current.map((r) => r.courses?.id));
  const available = offered.filter((c) => !taken.has(c.id));
  const registeredUnits = current.reduce((n, r) => n + (r.courses?.units ?? 0), 0);
  const pickedUnits = available.filter((c) => picked.includes(c.id)).reduce((n, c) => n + c.units, 0);

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("register_courses", { _course_ids: picked });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration saved");
      setPicked([]);
      qc.invalidateQueries({ queryKey: ["registrations", me.id] });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <PageHeader
        eyebrow={`${sem?.academic_sessions?.name ?? ""} · ${termLabel(sem?.term)}`}
        title="Course registration"
        description={sem?.registration_open ? "Pick the courses you will take this semester." : "Registration is closed for this semester."}
        actions={<Button variant="outline" onClick={() => window.print()}><Printer /> Print summary</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Available to you" className="no-print">
          {available.length === 0 ? (
            <Empty>Nothing left to register for this semester.</Empty>
          ) : (
            <div className="space-y-2">
              {available.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={cn("flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all", on ? "border-primary bg-accent" : "border-border hover:border-primary/40")}
                  >
                    <span className={cn("flex size-5 items-center justify-center rounded-full border", on ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                      {on && <Check className="size-3" />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{c.code}</span>
                      <span className="block text-sm text-muted-foreground">{c.title}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">{c.units} units</span>
                  </button>
                );
              })}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">Total after saving: <span className="font-semibold text-foreground">{registeredUnits + pickedUnits}</span> / 24 units</p>
                <Button variant="hero" disabled={!picked.length || submit.isPending || !sem?.registration_open} onClick={() => submit.mutate()}>
                  Register {picked.length || ""}
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Registration summary">
          <div className="mb-4 text-sm text-muted-foreground">
            {me.profile?.full_name} · {student?.matric_no} · {student?.level} Level
          </div>
          {current.length === 0 ? (
            <Empty>No courses registered yet.</Empty>
          ) : (
            <DataTable head={["Code", "Title", "Units"]}>
              {current.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} font-medium`}>{r.courses?.code}</td>
                  <td className={td}>{r.courses?.title}</td>
                  <td className={td}>{r.courses?.units}</td>
                </tr>
              ))}
              <tr>
                <td className={td} colSpan={2}><span className="font-semibold">Total units</span></td>
                <td className={`${td} font-semibold`}>{registeredUnits}</td>
              </tr>
            </DataTable>
          )}
        </Panel>
      </div>
    </>
  );
}
