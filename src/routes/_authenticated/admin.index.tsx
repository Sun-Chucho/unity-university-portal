import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Building2, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { PageHeader, Stat } from "@/components/portal";
import { AuditTrail } from "@/components/admin/reports";
import { supabase } from "@/integrations/supabase/client";
import { currentSemesterQuery, termLabel } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const { data: sem } = useQuery(currentSemesterQuery);
  const { data } = useQuery({
    queryKey: ["uni-stats"],
    queryFn: async () => {
      const count = (t: "students" | "lecturers" | "departments" | "courses" | "registrations") =>
        supabase.from(t).select("id", { count: "exact", head: true }).then((r) => r.count ?? 0);
      const [students, lecturers, departments, courses, registrations, pending] = await Promise.all([
        count("students"), count("lecturers"), count("departments"), count("courses"), count("registrations"),
        supabase.from("result_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted").then((r) => r.count ?? 0),
      ]);
      return { students, lecturers, departments, courses, registrations, pending };
    },
  });

  return (
    <>
      <PageHeader eyebrow={`${sem?.academic_sessions?.name ?? ""} · ${termLabel(sem?.term)}`} title="University at a glance" description="Everything happening across faculties, in one place." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Students" value={data?.students ?? "-"} icon={GraduationCap} />
        <Stat label="Lecturers" value={data?.lecturers ?? "-"} icon={Users} />
        <Stat label="Departments" value={data?.departments ?? "-"} icon={Building2} />
        <Stat label="Courses" value={data?.courses ?? "-"} hint={`${data?.registrations ?? 0} registrations all time`} icon={BookOpen} />
        <Stat label="Awaiting approval" value={data?.pending ?? "-"} icon={ClipboardCheck} />
      </div>
      <div className="mt-6"><AuditTrail limit={20} /></div>
    </>
  );
}
