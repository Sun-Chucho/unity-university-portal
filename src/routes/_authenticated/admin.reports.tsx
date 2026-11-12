import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/portal";
import { Reports } from "@/components/admin/reports";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: () => (
    <>
      <PageHeader title="University report" actions={<Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>} />
      <Reports />
    </>
  ),
});
