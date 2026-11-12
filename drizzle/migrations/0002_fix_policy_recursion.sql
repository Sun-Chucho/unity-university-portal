create or replace function public.dept_of(_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = _user
$$;
create or replace function public.is_lecturer(_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lecturers where id = _user)
$$;

drop policy "see profiles" on public.profiles;
create policy "see profiles" on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_super_admin() or public.is_dept_admin_of(department_id)
  or public.lecturer_teaches_student(id) or public.is_lecturer(id)
);

drop policy "see roles" on public.user_roles;
create policy "see roles" on public.user_roles for select to authenticated using (
  user_id = auth.uid() or public.is_super_admin() or public.is_dept_admin_of(public.dept_of(user_id))
);

drop policy "see students" on public.students;
create policy "see students" on public.students for select to authenticated using (
  id = auth.uid() or public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)) or public.lecturer_teaches_student(id)
);
drop policy "admins manage students" on public.students;
create policy "admins insert students" on public.students for insert to authenticated
  with check (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)));
create policy "admins update students" on public.students for update to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)))
  with check (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)));
create policy "admins delete students" on public.students for delete to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)));

drop policy "admins manage lecturers" on public.lecturers;
create policy "admins insert lecturers" on public.lecturers for insert to authenticated
  with check (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)));
create policy "admins update lecturers" on public.lecturers for update to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)))
  with check (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)));
create policy "admins delete lecturers" on public.lecturers for delete to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of(public.dept_of(id)));