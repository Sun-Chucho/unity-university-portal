create or replace function public.register_courses(_course_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare
  st record; sem record; c record; cid uuid; added int := 0; total_units int;
begin
  select s.*, p.department_id, p.status into st
  from public.students s join public.profiles p on p.id = s.id where s.id = auth.uid();
  if st.id is null then raise exception 'Only students can register courses'; end if;
  if st.status <> 'active' then raise exception 'Your account is not active'; end if;

  select * into sem from public.semesters where is_current;
  if sem.id is null then raise exception 'No active semester'; end if;
  if not sem.registration_open then raise exception 'Registration is closed for this semester'; end if;
  if coalesce(array_length(_course_ids, 1), 0) = 0 then raise exception 'Pick at least one course'; end if;

  foreach cid in array _course_ids loop
    select * into c from public.courses where id = cid;
    if c.id is null then raise exception 'Course not found'; end if;
    if c.department_id <> st.department_id
       or (c.program_id is not null and c.program_id <> st.program_id)
       or c.level <> st.level or c.term <> sem.term then
      raise exception '% is not available to you this semester', c.code;
    end if;
    if exists (select 1 from public.registrations where student_id = st.id and course_id = cid and semester_id = sem.id) then
      raise exception 'You already registered %', c.code;
    end if;
    insert into public.registrations (student_id, course_id, semester_id) values (st.id, cid, sem.id);
    added := added + 1;
  end loop;

  select coalesce(sum(co.units), 0) into total_units
  from public.registrations r join public.courses co on co.id = r.course_id
  where r.student_id = st.id and r.semester_id = sem.id;
  if total_units > 24 then raise exception 'Maximum load is 24 units per semester'; end if;

  perform public.log_action('register', 'registration', st.id, st.department_id, jsonb_build_object('courses', _course_ids));
  return added;
end $$;