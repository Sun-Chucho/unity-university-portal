import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { ResultsReview } from "@/components/admin/review";

export const Route = createFileRoute("/_authenticated/admin/approvals")({
  component: () => (
    <>
      <PageHeader title="Result approvals" description="Oversight view. Approval decisions belong to each department." />
      <ResultsReview canReview={false} />
    </>
  ),
});
