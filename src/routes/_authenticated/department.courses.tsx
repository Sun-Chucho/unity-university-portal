import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { CoursesManager } from "@/components/admin/courses";
import { ProgramsManager } from "@/components/admin/structure";

export const Route = createFileRoute("/_authenticated/department/courses")({
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    const dept = me.profile?.department_id;
    return (
      <>
        <PageHeader title="Courses and programs" description="Create courses and choose who teaches them this semester." />
        <div className="space-y-6">
          <CoursesManager departmentId={dept} />
          <ProgramsManager departmentId={dept} />
        </div>
      </>
    );
  },
});
