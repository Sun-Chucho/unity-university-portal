import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { CoursesManager } from "@/components/admin/courses";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  component: () => (
    <>
      <PageHeader title="Courses and allocations" description="Every course in every department, and who teaches it now." />
      <CoursesManager />
    </>
  ),
});
