import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/portal";
import { AuditTrail } from "@/components/admin/reports";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/department/")({
  component: DeptHome,
});

function DeptHome() {
  const { me } = Route.useRouteContext();
  const dept = me.profile?.department_id ?? null;

  const { data } = useQuery({
    queryKey: ["dept-stats", dept],
    queryFn: async () => {
      const [students, lecturers, courses, subs] = await Promise.all([
        supabase.from("profiles").select("id, students!inner(id)", { count: "exact", head: true }).eq("department_id", dept!),
        supabase.from("profiles").select("id, lecturers!inner(id)", { count: "exact", head: true }).eq("department_id", dept!),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("department_id", dept!),
        supabase.from("result_submissions").select("id, courses!inner(department_id)").eq("status", "submitted").eq("courses.department_id", dept!),
      ]);
      return { students: students.count ?? 0, lecturers: lecturers.count ?? 0, courses: courses.count ?? 0, pending: subs.data?.length ?? 0 };
    },
  });

  return (
    <>
      <PageHeader
        eyebrow={me.profile?.departments?.name ?? "Department"}
        title="Department overview"
        actions={<Button asChild variant="hero"><Link to="/department/results">Review results</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={data?.students ?? "-"} icon={GraduationCap} />
        <Stat label="Lecturers" value={data?.lecturers ?? "-"} icon={Users} />
        <Stat label="Courses" value={data?.courses ?? "-"} icon={BookOpen} />
        <Stat label="Pending approvals" value={data?.pending ?? "-"} icon={ClipboardCheck} />
      </div>
      <div className="mt-6"><AuditTrail departmentId={dept} limit={15} /></div>
    </>
  );
}
