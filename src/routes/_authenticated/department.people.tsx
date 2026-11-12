import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { PeopleManager } from "@/components/admin/people";

export const Route = createFileRoute("/_authenticated/department/people")({
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    return (
      <>
        <PageHeader title="Students and staff" description="Register students and lecturers in your department." />
        <PeopleManager departmentId={me.profile?.department_id} />
      </>
    );
  },
});
