create or replace function public.can_see_result(_registration uuid, _submission uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.result_submissions s join public.courses c on c.id = s.course_id
    where s.id = _submission and (
      s.lecturer_id = auth.uid()
      or public.is_super_admin()
      or public.is_dept_admin_of(c.department_id)
      or (s.status = 'approved' and exists (select 1 from public.registrations r where r.id = _registration and r.student_id = auth.uid()))
    )
  )
$$;
drop policy "see results" on public.results;
create policy "see results" on public.results for select to authenticated using (public.can_see_result(registration_id, submission_id));