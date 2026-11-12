import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/portal";
import { Reports } from "@/components/admin/reports";

export const Route = createFileRoute("/_authenticated/department/reports")({
  component: function RolePage() {
    const { me } = Route.useRouteContext();
    return (
      <>
        <PageHeader
          eyebrow={me.profile?.departments?.name ?? undefined}
          title="Departmental report"
          actions={<Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>}
        />
        <Reports departmentId={me.profile?.department_id} />
      </>
    );
  },
});
