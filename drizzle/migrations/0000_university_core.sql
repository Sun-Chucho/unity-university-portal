-- Roles and statuses
create type public.app_role as enum ('student', 'lecturer', 'dept_admin', 'super_admin');
create type public.account_status as enum ('active', 'suspended', 'deactivated');
create type public.semester_term as enum ('first', 'second');
create type public.submission_status as enum ('draft', 'submitted', 'approved', 'returned');

-- Academic structure
create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete restrict,
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  name text not null,
  code text not null unique,
  duration_years int not null default 4 check (duration_years between 1 and 7),
  created_at timestamptz not null default now()
);

create table public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_current_session on public.academic_sessions (is_current) where is_current;

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.academic_sessions(id) on delete cascade,
  term public.semester_term not null,
  is_current boolean not null default false,
  registration_open boolean not null default true,
  unique (session_id, term)
);
create unique index one_current_semester on public.semesters (is_current) where is_current;

-- Grading scale lives in a table so it can be tuned without code changes
create table public.grading_scale (
  grade text primary key,
  min_score numeric not null check (min_score between 0 and 100),
  max_score numeric not null check (max_score between 0 and 100),
  points numeric not null check (points >= 0)
);

-- People
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  address text,
  department_id uuid references public.departments(id) on delete set null,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  matric_no text not null unique,
  program_id uuid not null references public.programs(id) on delete restrict,
  level int not null default 100 check (level in (100, 200, 300, 400, 500)),
  entry_session text
);

create table public.lecturers (
  id uuid primary key references public.profiles(id) on delete cascade,
  staff_no text not null unique,
  title text default 'Dr.'
);

-- Courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  program_id uuid references public.programs(id) on delete set null,
  code text not null unique,
  title text not null,
  units int not null check (units between 1 and 6),
  level int not null check (level in (100, 200, 300, 400, 500)),
  term public.semester_term not null,
  created_at timestamptz not null default now()
);

create table public.course_allocations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, semester_id)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (student_id, course_id, semester_id)
);

create table public.result_submissions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id),
  status public.submission_status not null default 'draft',
  feedback text,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (course_id, semester_id)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  submission_id uuid not null references public.result_submissions(id) on delete cascade,
  ca_score numeric not null default 0 check (ca_score between 0 and 40),
  exam_score numeric not null default 0 check (exam_score between 0 and 60),
  total numeric generated always as (ca_score + exam_score) stored,
  grade text,
  points numeric,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text not null,
  entity text not null,
  entity_id uuid,
  department_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Grants
grant select on public.faculties, public.departments, public.programs, public.academic_sessions,
  public.semesters, public.grading_scale, public.courses, public.course_allocations to authenticated;
grant insert, update, delete on public.faculties, public.departments, public.programs,
  public.academic_sessions, public.semesters, public.grading_scale, public.courses,
  public.course_allocations to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.students, public.lecturers to authenticated;
grant select on public.registrations, public.results, public.result_submissions, public.audit_logs to authenticated;
grant all on all tables in schema public to service_role;

-- Permission helpers. Security definer keeps them out of RLS recursion.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'super_admin')
$$;

create or replace function public.my_department()
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_dept_admin_of(_dept uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _dept is not null
    and public.has_role(auth.uid(), 'dept_admin')
    and public.my_department() = _dept
$$;

create or replace function public.current_semester_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.semesters where is_current limit 1
$$;

create or replace function public.lecturer_teaches_course(_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.course_allocations where course_id = _course and lecturer_id = auth.uid())
$$;

create or replace function public.lecturer_teaches_student(_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.registrations r
    join public.course_allocations a on a.course_id = r.course_id and a.semester_id = r.semester_id
    where r.student_id = _student and a.lecturer_id = auth.uid()
  )
$$;

create or replace function public.grade_for(_total numeric, out grade text, out points numeric)
language sql stable security definer set search_path = public as $$
  select g.grade, g.points from public.grading_scale g
  where _total >= g.min_score and _total <= g.max_score
  order by g.min_score desc limit 1
$$;

create or replace function public.log_action(_action text, _entity text, _entity_id uuid, _dept uuid, _details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, department_id, details)
  values (auth.uid(), (select full_name from public.profiles where id = auth.uid()), _action, _entity, _entity_id, _dept, coalesce(_details, '{}'::jsonb));
end $$;

-- RLS
alter table public.faculties enable row level security;
alter table public.departments enable row level security;
alter table public.programs enable row level security;
alter table public.academic_sessions enable row level security;
alter table public.semesters enable row level security;
alter table public.grading_scale enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.students enable row level security;
alter table public.lecturers enable row level security;
alter table public.courses enable row level security;
alter table public.course_allocations enable row level security;
alter table public.registrations enable row level security;
alter table public.result_submissions enable row level security;
alter table public.results enable row level security;
alter table public.audit_logs enable row level security;

-- Reference data: everyone signed in reads, super admin writes
create policy "read faculties" on public.faculties for select to authenticated using (true);
create policy "super manages faculties" on public.faculties for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "read departments" on public.departments for select to authenticated using (true);
create policy "super manages departments" on public.departments for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "read sessions" on public.academic_sessions for select to authenticated using (true);
create policy "super manages sessions" on public.academic_sessions for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "read semesters" on public.semesters for select to authenticated using (true);
create policy "super manages semesters" on public.semesters for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "read scale" on public.grading_scale for select to authenticated using (true);
create policy "super manages scale" on public.grading_scale for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Programs and courses: super admin or the owning department admin
create policy "read programs" on public.programs for select to authenticated using (true);
create policy "admins manage programs" on public.programs for all to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of(department_id))
  with check (public.is_super_admin() or public.is_dept_admin_of(department_id));
create policy "read courses" on public.courses for select to authenticated using (true);
create policy "admins manage courses" on public.courses for all to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of(department_id))
  with check (public.is_super_admin() or public.is_dept_admin_of(department_id));
create policy "read allocations" on public.course_allocations for select to authenticated using (true);
create policy "admins manage allocations" on public.course_allocations for all to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of((select department_id from public.courses c where c.id = course_id)))
  with check (public.is_super_admin() or public.is_dept_admin_of((select department_id from public.courses c where c.id = course_id)));

-- Profiles
create policy "see profiles" on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_super_admin() or public.is_dept_admin_of(department_id)
  or public.lecturer_teaches_student(id)
  or exists (select 1 from public.lecturers l where l.id = profiles.id)
);
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admins update profiles" on public.profiles for update to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of(department_id))
  with check (public.is_super_admin() or public.is_dept_admin_of(department_id));

-- Keep students from editing the fields an admin owns
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_super_admin() or public.is_dept_admin_of(old.department_id) then
    return new;
  end if;
  if new.department_id is distinct from old.department_id
     or new.status is distinct from old.status
     or new.email is distinct from old.email
     or new.full_name is distinct from old.full_name then
    raise exception 'Only an administrator can change name, email, department or status';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Roles: users see their own, admins see roles they need
create policy "see roles" on public.user_roles for select to authenticated using (
  user_id = auth.uid() or public.is_super_admin()
  or (public.has_role(auth.uid(), 'dept_admin') and exists (
    select 1 from public.profiles p where p.id = user_roles.user_id and p.department_id = public.my_department()))
);
create policy "super manages roles" on public.user_roles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Students and lecturers
create policy "see students" on public.students for select to authenticated using (
  id = auth.uid() or public.is_super_admin()
  or public.is_dept_admin_of((select department_id from public.profiles p where p.id = students.id))
  or public.lecturer_teaches_student(id)
);
create policy "admins manage students" on public.students for all to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of((select department_id from public.profiles p where p.id = students.id)))
  with check (public.is_super_admin() or public.is_dept_admin_of((select department_id from public.programs pr where pr.id = program_id)));
create policy "see lecturers" on public.lecturers for select to authenticated using (true);
create policy "admins manage lecturers" on public.lecturers for all to authenticated
  using (public.is_super_admin() or public.is_dept_admin_of((select department_id from public.profiles p where p.id = lecturers.id)))
  with check (public.is_super_admin() or public.is_dept_admin_of((select department_id from public.profiles p where p.id = lecturers.id)));

-- Registrations: read only here, writes go through register_courses()
create policy "see registrations" on public.registrations for select to authenticated using (
  student_id = auth.uid() or public.is_super_admin()
  or public.is_dept_admin_of((select department_id from public.courses c where c.id = course_id))
  or exists (select 1 from public.course_allocations a where a.course_id = registrations.course_id and a.semester_id = registrations.semester_id and a.lecturer_id = auth.uid())
);

create policy "see submissions" on public.result_submissions for select to authenticated using (
  lecturer_id = auth.uid() or public.is_super_admin()
  or public.is_dept_admin_of((select department_id from public.courses c where c.id = course_id))
);

-- Students only ever see approved results
create policy "see results" on public.results for select to authenticated using (
  public.is_super_admin()
  or exists (
    select 1 from public.result_submissions s where s.id = results.submission_id
      and (s.lecturer_id = auth.uid() or public.is_dept_admin_of((select department_id from public.courses c where c.id = s.course_id)))
  )
  or exists (
    select 1 from public.registrations r join public.result_submissions s on s.id = results.submission_id
    where r.id = results.registration_id and r.student_id = auth.uid() and s.status = 'approved'
  )
);

create policy "see audit" on public.audit_logs for select to authenticated using (
  public.is_super_admin() or public.is_dept_admin_of(department_id)
);

-- Lecturers can only teach in their own department
create or replace function public.guard_allocation()
returns trigger language plpgsql security definer set search_path = public as $$
declare course_dept uuid; lect_dept uuid;
begin
  select department_id into course_dept from public.courses where id = new.course_id;
  select department_id into lect_dept from public.profiles where id = new.lecturer_id;
  if course_dept is distinct from lect_dept then
    raise exception 'Lecturer must belong to the course department';
  end if;
  perform public.log_action('allocate', 'course', new.course_id, course_dept, jsonb_build_object('lecturer_id', new.lecturer_id));
  return new;
end $$;
create trigger allocation_guard before insert or update on public.course_allocations
  for each row execute function public.guard_allocation();

-- Grade and points are always derived from the scale
create or replace function public.apply_grade()
returns trigger language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from public.grade_for(new.ca_score + new.exam_score);
  new.grade := g.grade;
  new.points := g.points;
  new.updated_at := now();
  return new;
end $$;
create trigger results_grade before insert or update on public.results
  for each row execute function public.apply_grade();

-- Workflow 1: course registration
create or replace function public.register_courses(_course_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare
  st record; sem record; c record; added int := 0; total_units int;
begin
  select s.*, p.department_id, p.status into st
  from public.students s join public.profiles p on p.id = s.id where s.id = auth.uid();
  if st.id is null then raise exception 'Only students can register courses'; end if;
  if st.status <> 'active' then raise exception 'Your account is not active'; end if;

  select * into sem from public.semesters where is_current;
  if sem.id is null then raise exception 'No active semester'; end if;
  if not sem.registration_open then raise exception 'Registration is closed for this semester'; end if;

  foreach c.id in array _course_ids loop
    select * into c from public.courses where id = c.id;
    if c.id is null then raise exception 'Course not found'; end if;
    if c.department_id <> st.department_id
       or (c.program_id is not null and c.program_id <> st.program_id)
       or c.level <> st.level or c.term <> sem.term then
      raise exception '% is not available to you this semester', c.code;
    end if;
    if exists (select 1 from public.registrations where student_id = st.id and course_id = c.id and semester_id = sem.id) then
      raise exception 'You already registered %', c.code;
    end if;
    insert into public.registrations (student_id, course_id, semester_id) values (st.id, c.id, sem.id);
    added := added + 1;
  end loop;

  select coalesce(sum(co.units), 0) into total_units
  from public.registrations r join public.courses co on co.id = r.course_id
  where r.student_id = st.id and r.semester_id = sem.id;
  if total_units > 24 then raise exception 'Maximum load is 24 units per semester'; end if;

  perform public.log_action('register', 'registration', st.id, st.department_id, jsonb_build_object('courses', _course_ids));
  return added;
end $$;

-- Workflow 2: lecturers save drafts or submit
create or replace function public.save_scores(_course_id uuid, _scores jsonb, _submit boolean default false)
returns public.submission_status language plpgsql security definer set search_path = public as $$
declare
  sem_id uuid := public.current_semester_id(); sub record; item jsonb; reg record; dept uuid; missing int;
begin
  if not exists (select 1 from public.course_allocations where course_id = _course_id and semester_id = sem_id and lecturer_id = auth.uid()) then
    raise exception 'You are not assigned to this course';
  end if;
  select department_id into dept from public.courses where id = _course_id;

  insert into public.result_submissions (course_id, semester_id, lecturer_id)
  values (_course_id, sem_id, auth.uid())
  on conflict (course_id, semester_id) do nothing;
  select * into sub from public.result_submissions where course_id = _course_id and semester_id = sem_id;
  if sub.status not in ('draft', 'returned') then
    raise exception 'These results are % and locked until the department reopens them', sub.status;
  end if;

  for item in select * from jsonb_array_elements(coalesce(_scores, '[]'::jsonb)) loop
    select * into reg from public.registrations where id = (item->>'registration_id')::uuid;
    if reg.id is null or reg.course_id <> _course_id or reg.semester_id <> sem_id then
      raise exception 'Student is not registered for this course';
    end if;
    insert into public.results (registration_id, submission_id, ca_score, exam_score)
    values (reg.id, sub.id, (item->>'ca')::numeric, (item->>'exam')::numeric)
    on conflict (registration_id) do update set ca_score = excluded.ca_score, exam_score = excluded.exam_score;
  end loop;

  if _submit then
    select count(*) into missing from public.registrations r
    where r.course_id = _course_id and r.semester_id = sem_id
      and not exists (select 1 from public.results x where x.registration_id = r.id);
    if missing > 0 then raise exception '% student(s) still have no score', missing; end if;
    update public.result_submissions set status = 'submitted', submitted_at = now(), updated_at = now() where id = sub.id;
    perform public.log_action('submit', 'result_submission', sub.id, dept, '{}'::jsonb);
    return 'submitted';
  end if;

  update public.result_submissions set status = 'draft', updated_at = now() where id = sub.id;
  perform public.log_action('save_draft', 'result_submission', sub.id, dept, jsonb_build_object('rows', jsonb_array_length(coalesce(_scores, '[]'::jsonb))));
  return 'draft';
end $$;

-- Workflow 3: department review. Approve, return for correction, or reopen.
create or replace function public.review_results(_submission_id uuid, _action text, _feedback text default null)
returns public.submission_status language plpgsql security definer set search_path = public as $$
declare sub record; dept uuid; next_status public.submission_status;
begin
  select * into sub from public.result_submissions where id = _submission_id;
  if sub.id is null then raise exception 'Submission not found'; end if;
  select department_id into dept from public.courses where id = sub.course_id;
  if not public.is_dept_admin_of(dept) then raise exception 'Only this department''s admin can review these results'; end if;
  if sub.lecturer_id = auth.uid() then raise exception 'You cannot review your own results'; end if;

  if _action = 'approve' then
    if sub.status <> 'submitted' then raise exception 'Only submitted results can be approved'; end if;
    next_status := 'approved';
  elsif _action = 'return' then
    if sub.status not in ('submitted', 'approved') then raise exception 'Nothing to return'; end if;
    if coalesce(trim(_feedback), '') = '' then raise exception 'Please tell the lecturer what to fix'; end if;
    next_status := 'returned';
  else
    raise exception 'Unknown action';
  end if;

  update public.result_submissions
  set status = next_status, feedback = nullif(trim(coalesce(_feedback, '')), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = sub.id;
  perform public.log_action(_action, 'result_submission', sub.id, dept, jsonb_build_object('feedback', _feedback, 'from', sub.status));
  return next_status;
end $$;

grant execute on function public.register_courses(uuid[]) to authenticated;
grant execute on function public.save_scores(uuid, jsonb, boolean) to authenticated;
grant execute on function public.review_results(uuid, text, text) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Reference data
insert into public.grading_scale (grade, min_score, max_score, points) values
  ('A', 70, 100, 5), ('B', 60, 69.99, 4), ('C', 50, 59.99, 3),
  ('D', 45, 49.99, 2), ('E', 40, 44.99, 1), ('F', 0, 39.99, 0);

insert into public.faculties (id, name, code) values
  ('10000000-0000-0000-0000-000000000001', 'Faculty of Science', 'SCI'),
  ('10000000-0000-0000-0000-000000000002', 'Faculty of Engineering', 'ENG');

insert into public.departments (id, faculty_id, name, code) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Computer Science', 'CSC'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Mathematics', 'MTH'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Electrical Engineering', 'EEE');

insert into public.programs (id, department_id, name, code, duration_years) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'B.Sc. Computer Science', 'BSC-CSC', 4),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'B.Sc. Mathematics', 'BSC-MTH', 4),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'B.Eng. Electrical Engineering', 'BENG-EEE', 5);

insert into public.academic_sessions (id, name, is_current) values
  ('40000000-0000-0000-0000-000000000001', '2024/2025', false),
  ('40000000-0000-0000-0000-000000000002', '2025/2026', true);

insert into public.semesters (id, session_id, term, is_current, registration_open) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'first', false, false),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'second', false, false),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'first', true, true),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 'second', false, false);

insert into public.courses (id, department_id, program_id, code, title, units, level, term) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null, 'CSC101', 'Introduction to Computing', 3, 100, 'first'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', null, 'CSC103', 'Programming Fundamentals', 3, 100, 'first'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', null, 'CSC102', 'Discrete Structures', 2, 100, 'second'),
  ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', null, 'CSC104', 'Introduction to Web Technologies', 2, 100, 'second'),
  ('60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', null, 'CSC201', 'Data Structures and Algorithms', 3, 200, 'first'),
  ('60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', null, 'CSC203', 'Computer Architecture', 3, 200, 'first'),
  ('60000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', null, 'CSC205', 'Database Systems I', 3, 200, 'first'),
  ('60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', null, 'CSC207', 'Object Oriented Programming', 2, 200, 'first'),
  ('60000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', null, 'MTH201', 'Linear Algebra', 3, 200, 'first'),
  ('60000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003', null, 'EEE201', 'Circuit Theory', 3, 200, 'first');