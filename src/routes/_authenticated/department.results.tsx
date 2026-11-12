import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { ResultsReview } from "@/components/admin/review";

export const Route = createFileRoute("/_authenticated/department/results")({
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    return (
      <>
        <PageHeader title="Result approvals" description="Approved results become visible to students immediately. Returned results go back to the lecturer with your note." />
        <ResultsReview departmentId={me.profile?.department_id} canReview />
      </>
    );
  },
});
