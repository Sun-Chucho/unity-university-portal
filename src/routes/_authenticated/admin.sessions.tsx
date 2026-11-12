import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { SessionsManager } from "@/components/admin/structure";

export const Route = createFileRoute("/_authenticated/admin/sessions")({
  component: () => (
    <>
      <PageHeader title="Academic sessions" description="Set the current semester and open or close course registration." />
      <SessionsManager />
    </>
  ),
});
