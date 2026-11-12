import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, Send, Users } from "lucide-react";
import { Empty, PageHeader, Panel, Stat, StatusPill } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { currentSemesterQuery, termLabel } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/lecturer/")({
  component: LecturerHome,
});

function LecturerHome() {
  const { me } = Route.useRouteContext();
  const { data: sem } = useQuery(currentSemesterQuery);

  const { data } = useQuery({
    enabled: !!sem,
    queryKey: ["lecturer-courses", me.id, sem?.id],
    queryFn: async () => {
      const { data: allocs, error } = await supabase
        .from("course_allocations")
        .select("id, course_id, courses(code, title, units, level)")
        .eq("lecturer_id", me.id)
        .eq("semester_id", sem!.id);
      if (error) throw error;
      const ids = (allocs ?? []).map((a) => a.course_id);
      const [{ data: subs }, { data: regs }] = await Promise.all([
        supabase.from("result_submissions").select("course_id, status, feedback").eq("semester_id", sem!.id).in("course_id", ids),
        supabase.from("registrations").select("course_id").eq("semester_id", sem!.id).in("course_id", ids),
      ]);
      return (allocs ?? []).map((a) => ({
        ...a,
        sub: subs?.find((s) => s.course_id === a.course_id),
        students: regs?.filter((r) => r.course_id === a.course_id).length ?? 0,
      }));
    },
  });

  const courses = data ?? [];
  const students = courses.reduce((n, c) => n + c.students, 0);
  const pending = courses.filter((c) => !c.sub || c.sub.status === "draft" || c.sub.status === "returned").length;

  return (
    <>
      <PageHeader eyebrow={`${sem?.academic_sessions?.name ?? ""} · ${termLabel(sem?.term)}`} title="My courses" description="Enter scores, save drafts and submit to your department." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Assigned courses" value={courses.length} icon={ClipboardList} />
        <Stat label="Students taught" value={students} icon={Users} />
        <Stat label="Awaiting your submission" value={pending} icon={Send} />
      </div>

      <Panel className="mt-6" title="This semester">
        {courses.length === 0 ? (
          <Empty>No courses have been assigned to you this semester.</Empty>
        ) : (
          <div className="divide-y divide-border">
            {courses.map((c) => (
              <Link key={c.id} to="/lecturer/course/$courseId" params={{ courseId: c.course_id }} className="group flex items-center gap-4 py-4">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-xs font-semibold text-accent-foreground">{c.courses?.level}</div>
                <div className="flex-1">
                  <p className="font-semibold">{c.courses?.code} <span className="font-normal text-muted-foreground">· {c.courses?.title}</span></p>
                  <p className="text-sm text-muted-foreground">{c.students} students · {c.courses?.units} units</p>
                  {c.sub?.status === "returned" && c.sub.feedback && <p className="mt-1 text-sm text-destructive">Feedback: {c.sub.feedback}</p>}
                </div>
                <StatusPill status={c.sub?.status ?? "none"} />
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
