import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { FacultiesAndDepartments, ProgramsManager } from "@/components/admin/structure";

export const Route = createFileRoute("/_authenticated/admin/structure")({
  component: () => (
    <>
      <PageHeader title="Faculties and departments" description="The academic structure every record hangs from." />
      <div className="space-y-6">
        <FacultiesAndDepartments />
        <ProgramsManager />
      </div>
    </>
  ),
});
