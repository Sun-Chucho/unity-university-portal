import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Empty, Panel, StatusPill, td } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { errorText } from "@/lib/session";
import { termLabel } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Tab = "submitted" | "approved" | "returned" | "draft";

// Workflow 3. Department admins act; the super admin only watches.
export function ResultsReview({ departmentId, canReview }: { departmentId?: string | null; canReview: boolean }) {
  const [tab, setTab] = useState<Tab>("submitted");
  const [open, setOpen] = useState<string | null>(null);

  const { data: subs = [] } = useQuery({
    queryKey: ["submissions", departmentId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("result_submissions")
        .select("id, status, feedback, submitted_at, reviewed_at, courses!inner(code, title, department_id, departments(code)), semesters(term, academic_sessions(name)), lecturers(title, profiles(full_name))")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((s) => !departmentId || s.courses?.department_id === departmentId);
    },
  });

  const shown = subs.filter((s) => s.status === tab);
  const count = (t: Tab) => subs.filter((s) => s.status === t).length;

  return (
    <Panel>
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {(["submitted", "approved", "returned", "draft"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize", tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {t === "submitted" ? "Pending review" : t} · {count(t)}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty>{tab === "submitted" ? "Nothing waiting for review. Nice." : "Nothing here."}</Empty>
      ) : (
        <div className="divide-y divide-border">
          {shown.map((s) => (
            <div key={s.id} className="py-3">
              <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center gap-4 text-left">
                <div className="flex-1">
                  <p className="font-semibold">{s.courses?.code} <span className="font-normal text-muted-foreground">· {s.courses?.title}</span></p>
                  <p className="text-sm text-muted-foreground">
                    {s.lecturers?.title} {s.lecturers?.profiles?.full_name} · {s.semesters?.academic_sessions?.name} {termLabel(s.semesters?.term)}
                  </p>
                </div>
                <StatusPill status={s.status} />
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open === s.id && "rotate-180")} />
              </button>
              {open === s.id && <SubmissionDetail id={s.id} status={s.status} feedback={s.feedback} canReview={canReview} />}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SubmissionDetail({ id, status, feedback, canReview }: { id: string; status: string; feedback: string | null; canReview: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["submission-rows", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("id, ca_score, exam_score, total, grade, registrations(students(matric_no, profiles(full_name)))")
        .eq("submission_id", id);
      if (error) throw error;
      return (data ?? []).sort((a, b) => (a.registrations?.students?.matric_no ?? "").localeCompare(b.registrations?.students?.matric_no ?? ""));
    },
  });

  const act = useMutation({
    mutationFn: async (action: "approve" | "return") => {
      const { error } = await supabase.rpc("review_results", { _submission_id: id, _action: action, _feedback: note || undefined });
      if (error) throw error;
      return action;
    },
    onSuccess: (a) => {
      toast.success(a === "approve" ? "Approved. Students can now see these results." : "Returned to the lecturer");
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const avg = rows.length ? rows.reduce((n, r) => n + Number(r.total), 0) / rows.length : 0;
  const pass = rows.length ? (rows.filter((r) => Number(r.total) >= 40).length / rows.length) * 100 : 0;

  return (
    <div className="fade-up mt-4 rounded-2xl bg-muted/50 p-4">
      <div className="mb-3 flex gap-6 text-sm">
        <span>Students <b>{rows.length}</b></span>
        <span>Average <b>{avg.toFixed(1)}</b></span>
        <span>Pass rate <b>{pass.toFixed(0)}%</b></span>
      </div>
      {feedback && <p className="mb-3 text-sm text-destructive">Last feedback: {feedback}</p>}
      <DataTable head={["Matric", "Name", "CA", "Exam", "Total", "Grade"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={`${td} font-medium`}>{r.registrations?.students?.matric_no}</td>
            <td className={td}>{r.registrations?.students?.profiles?.full_name}</td>
            <td className={td}>{r.ca_score}</td>
            <td className={td}>{r.exam_score}</td>
            <td className={td}>{r.total}</td>
            <td className={`${td} font-semibold`}>{r.grade}</td>
          </tr>
        ))}
      </DataTable>
      {canReview && (status === "submitted" || status === "approved") && (
        <div className="mt-4 space-y-3">
          <Textarea placeholder={status === "approved" ? "Reason for reopening" : "Feedback for the lecturer (required to return)"} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl bg-background" maxLength={500} />
          <div className="flex flex-wrap gap-2">
            {status === "submitted" && <Button variant="success" disabled={act.isPending} onClick={() => act.mutate("approve")}><Check /> Approve</Button>}
            <Button variant="outline" disabled={act.isPending} onClick={() => act.mutate("return")}><Undo2 /> {status === "approved" ? "Reopen for correction" : "Return for correction"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
