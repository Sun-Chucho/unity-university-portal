import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal";
import { PeopleManager } from "@/components/admin/people";

export const Route = createFileRoute("/_authenticated/admin/people")({
  component: () => (
    <>
      <PageHeader title="Accounts and roles" description="Create accounts, grant roles and suspend access across the university." />
      <PeopleManager superAdmin />
    </>
  ),
});
