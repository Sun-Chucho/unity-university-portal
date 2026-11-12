import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Empty, PageHeader, Panel, Stat, StatusPill, td } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { CA_MAX, EXAM_MAX, gradeFor } from "@/lib/grading";
import { currentSemesterQuery } from "@/lib/queries";
import { errorText } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/lecturer/course/$courseId")({
  component: CourseScores,
});

type Row = { ca: string; exam: string };

function CourseScores() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();
  const { data: sem } = useQuery(currentSemesterQuery);

  const { data, isLoading } = useQuery({
    enabled: !!sem,
    queryKey: ["course-sheet", courseId, sem?.id],
    queryFn: async () => {
      const [{ data: course }, { data: regs, error }, { data: sub }] = await Promise.all([
        supabase.from("courses").select("code, title, units").eq("id", courseId).maybeSingle(),
        supabase.from("registrations").select("id, students(matric_no, profiles(full_name))").eq("course_id", courseId).eq("semester_id", sem!.id),
        supabase.from("result_submissions").select("id, status, feedback").eq("course_id", courseId).eq("semester_id", sem!.id).maybeSingle(),
      ]);
      if (error) throw error;
      const ids = (regs ?? []).map((r) => r.id);
      const { data: results } = ids.length
        ? await supabase.from("results").select("registration_id, ca_score, exam_score").in("registration_id", ids)
        : { data: [] };
      const sorted = (regs ?? []).sort((a, b) => (a.students?.matric_no ?? "").localeCompare(b.students?.matric_no ?? ""));
      return { course, regs: sorted, sub, results: results ?? [] };
    },
  });

  const [sheet, setSheet] = useState<Record<string, Row>>({});
  useEffect(() => {
    if (!data) return;
    const next: Record<string, Row> = {};
    for (const r of data.regs) {
      const saved = data.results.find((x) => x.registration_id === r.id);
      next[r.id] = { ca: saved ? String(saved.ca_score) : "", exam: saved ? String(saved.exam_score) : "" };
    }
    setSheet(next);
  }, [data]);

  const locked = data?.sub?.status === "submitted" || data?.sub?.status === "approved";

  const rows = useMemo(
    () =>
      (data?.regs ?? []).map((r) => {
        const s = sheet[r.id] ?? { ca: "", exam: "" };
        const ca = Number(s.ca), exam = Number(s.exam);
        const filled = s.ca !== "" && s.exam !== "";
        const valid = filled && ca >= 0 && ca <= CA_MAX && exam >= 0 && exam <= EXAM_MAX;
        return { reg: r, s, filled, valid, total: filled ? ca + exam : null };
      }),
    [data, sheet],
  );

  const graded = rows.filter((r) => r.valid);
  const avg = graded.length ? graded.reduce((n, r) => n + (r.total ?? 0), 0) / graded.length : 0;
  const passRate = graded.length ? (graded.filter((r) => (r.total ?? 0) >= 40).length / graded.length) * 100 : 0;

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      if (rows.some((r) => r.filled && !r.valid)) throw new Error(`CA must be 0 to ${CA_MAX} and exam 0 to ${EXAM_MAX}`);
      const scores = rows.filter((r) => r.valid).map((r) => ({ registration_id: r.reg.id, ca: Number(r.s.ca), exam: Number(r.s.exam) }));
      const { data: status, error } = await supabase.rpc("save_scores", { _course_id: courseId, _scores: scores, _submit: submit });
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "submitted" ? "Sent to your department for review" : "Draft saved");
      qc.invalidateQueries({ queryKey: ["course-sheet", courseId] });
      qc.invalidateQueries({ queryKey: ["lecturer-courses"] });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const set = (id: string, key: keyof Row, v: string) => setSheet((p) => ({ ...p, [id]: { ...p[id], [key]: v.replace(/[^0-9.]/g, "").slice(0, 5) } }));

  return (
    <>
      <Link to="/lecturer" className="no-print mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> My courses</Link>
      <PageHeader
        eyebrow={data?.course?.code}
        title={data?.course?.title ?? "Course"}
        description={`CA out of ${CA_MAX}, exam out of ${EXAM_MAX}. Grades are worked out for you.`}
        actions={
          locked ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> Locked until the department reopens it</span>
          ) : (
            <>
              <Button variant="outline" disabled={save.isPending || !rows.length} onClick={() => save.mutate(false)}><Save /> Save draft</Button>
              <Button variant="hero" disabled={save.isPending || !rows.length} onClick={() => save.mutate(true)}><Send /> Submit for review</Button>
            </>
          )
        }
      />

      {data?.sub?.status === "returned" && data.sub.feedback && (
        <div className="fade-up mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <span className="font-semibold text-destructive">Returned by department:</span> {data.sub.feedback}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Status" value={<StatusPill status={data?.sub?.status ?? "none"} />} />
        <Stat label="Students" value={rows.length} />
        <Stat label="Class average" value={avg.toFixed(1)} />
        <Stat label="Pass rate" value={`${passRate.toFixed(0)}%`} />
      </div>

      <Panel className="mt-6" title="Class list">
        {isLoading ? null : rows.length === 0 ? (
          <Empty>No students have registered for this course yet.</Empty>
        ) : (
          <DataTable head={["Matric", "Name", "CA", "Exam", "Total", "Grade"]}>
            {rows.map(({ reg, s, total, valid, filled }) => (
              <tr key={reg.id}>
                <td className={`${td} font-medium`}>{reg.students?.matric_no}</td>
                <td className={td}>{reg.students?.profiles?.full_name}</td>
                <td className={td}><Input inputMode="decimal" disabled={locked} value={s.ca} onChange={(e) => set(reg.id, "ca", e.target.value)} className="h-9 w-20 rounded-lg" aria-label="CA score" /></td>
                <td className={td}><Input inputMode="decimal" disabled={locked} value={s.exam} onChange={(e) => set(reg.id, "exam", e.target.value)} className="h-9 w-20 rounded-lg" aria-label="Exam score" /></td>
                <td className={`${td} font-medium ${filled && !valid ? "text-destructive" : ""}`}>{total ?? "-"}</td>
                <td className={`${td} font-semibold`}>{valid && total != null ? gradeFor(total).grade : "-"}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  );
}
