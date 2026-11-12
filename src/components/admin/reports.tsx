import { useQuery } from "@tanstack/react-query";
import { DataTable, Empty, Panel, td } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { currentSemesterQuery } from "@/lib/queries";

// Registration and performance numbers. Scoped by department when one is given.
export function Reports({ departmentId }: { departmentId?: string | null }) {
  const { data: sem } = useQuery(currentSemesterQuery);

  const { data } = useQuery({
    enabled: !!sem,
    queryKey: ["reports", departmentId ?? "all", sem?.id],
    queryFn: async () => {
      let cq = supabase.from("courses").select("id, code, title, units, department_id, departments(code)").order("code");
      if (departmentId) cq = cq.eq("department_id", departmentId);
      const [{ data: courses }, { data: regs }, { data: results }, { data: students }] = await Promise.all([
        cq,
        supabase.from("registrations").select("course_id, semester_id"),
        supabase.from("results").select("total, grade, registrations(course_id), result_submissions(status)"),
        supabase.from("students").select("level, profiles(department_id)"),
      ]);
      return { courses: courses ?? [], regs: regs ?? [], results: results ?? [], students: students ?? [] };
    },
  });

  if (!data) return null;
  const ids = new Set(data.courses.map((c) => c.id));
  const byCourse = data.courses.map((c) => {
    const rs = data.results.filter((r) => r.registrations?.course_id === c.id && r.result_submissions?.status === "approved");
    const avg = rs.length ? rs.reduce((n, r) => n + Number(r.total), 0) / rs.length : null;
    return {
      ...c,
      now: data.regs.filter((r) => r.course_id === c.id && r.semester_id === sem?.id).length,
      all: data.regs.filter((r) => r.course_id === c.id).length,
      graded: rs.length,
      avg,
      pass: rs.length ? (rs.filter((r) => Number(r.total) >= 40).length / rs.length) * 100 : null,
      a: rs.filter((r) => r.grade === "A").length,
    };
  });
  const levels = [100, 200, 300, 400, 500].map((l) => ({
    level: l,
    n: data.students.filter((s) => s.level === l && (!departmentId || s.profiles?.department_id === departmentId)).length,
  }));
  const totalRegsNow = data.regs.filter((r) => ids.has(r.course_id) && r.semester_id === sem?.id).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-5">
        {levels.map((l) => (
          <div key={l.level} className="rounded-3xl border border-border bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{l.level} Level</p>
            <p className="mt-1 font-display text-2xl font-semibold">{l.n}</p>
          </div>
        ))}
      </div>
      <Panel title="Courses and performance" action={<span className="text-sm text-muted-foreground">{totalRegsNow} registrations this semester</span>}>
        {byCourse.length === 0 ? (
          <Empty>No courses.</Empty>
        ) : (
          <DataTable head={["Course", "This semester", "All time", "Graded", "Average", "Pass rate", "A grades"]}>
            {byCourse.map((c) => (
              <tr key={c.id}>
                <td className={td}><span className="font-medium">{c.code}</span> <span className="text-muted-foreground">{c.title}</span></td>
                <td className={td}>{c.now}</td>
                <td className={td}>{c.all}</td>
                <td className={td}>{c.graded}</td>
                <td className={td}>{c.avg == null ? "-" : c.avg.toFixed(1)}</td>
                <td className={td}>{c.pass == null ? "-" : `${c.pass.toFixed(0)}%`}</td>
                <td className={td}>{c.a}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}

export function AuditTrail({ departmentId, limit = 50 }: { departmentId?: string | null; limit?: number }) {
  const { data = [] } = useQuery({
    queryKey: ["audit", departmentId ?? "all", limit],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Panel title="Activity">
      {data.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <div className="flex-1">
                <p><span className="font-medium">{a.actor_name ?? "System"}</span> <span className="text-muted-foreground">{describe(a.action)}</span> {a.action !== "register" && <span className="text-muted-foreground">{a.entity.replace("_", " ")}</span>}</p>
                {typeof a.details === "object" && a.details && "feedback" in a.details && a.details.feedback && (
                  <p className="text-xs text-muted-foreground">"{String(a.details.feedback)}"</p>
                )}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const describe = (action: string) =>
  ({
    approve: "approved",
    return: "returned",
    submit: "submitted",
    save_draft: "saved a draft of",
    register: "registered courses",
    allocate: "allocated a lecturer to",
    create_account: "created an account:",
    status_active: "activated",
    status_suspended: "suspended",
    status_deactivated: "deactivated",
    seed: "set up",
  })[action] ?? action;
