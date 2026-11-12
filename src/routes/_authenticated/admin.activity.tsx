import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { AuditTrail } from "@/components/admin/reports";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: () => (
    <>
      <PageHeader title="Activity log" description="Every submission, approval, return and account change, newest first." />
      <AuditTrail limit={200} />
    </>
  ),
});
