# Project instructions

- Preserve published Git history. Do not force push, rebase, amend or squash commits that are already pushed.
- Do not add or edit `supabase/migrations/` or `drizzle/`.
- Do not edit files whose headers say they are automatically generated.
- Keep secret values out of the repository and browser bundle.

## Project rules

- Workflow rules (registration, scoring, approval) live in security definer SQL functions, never in client code, so the browser cannot bypass them.
- RLS policies that look up another protected table must go through a security definer helper (has_role, dept_of, can_see_result) to avoid policy recursion.
- Roles live only in `user_roles`; account creation and suspension use server functions in `src/lib/accounts.functions.ts` because they need the auth admin API.
- Every role area is a pathless child of `_authenticated` with `requireRole` in `beforeLoad`, wrapped by the shared `AppShell`.
