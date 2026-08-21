-- Akyl Center: roles, private teacher journals and director analytics
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('director','teacher','admin','cleaner');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'teacher',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'general'
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  group_id uuid references public.groups(id) on delete set null,
  active boolean not null default true,
  quran_stage text not null default 'letters',
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unique(teacher_id,group_id,subject_id)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  lesson_date date not null default current_date,
  teacher_id uuid not null references public.profiles(id),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  grade smallint check (grade between 2 and 5),
  attendance text not null default 'present' check (attendance in ('present','absent','ill')),
  plan_text text,
  completed_text text,
  mistakes integer not null default 0 check (mistakes >= 0),
  quality text,
  teacher_decision text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_date,teacher_id,student_id,subject_id)
);

create table if not exists public.quran_progress (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null unique references public.journal_entries(id) on delete cascade,
  stage text not null check (stage in ('letters','muallim_sani','letter_practice','quran_reading','tajwid','juz_30','juz_29','circles','tatar_hafiz')),
  new_pages numeric(5,2) not null default 0,
  revision_pages numeric(6,2) not null default 0,
  revision_unit text not null default 'pages' check (revision_unit in ('pages','surahs','juz')),
  circle_number integer,
  juz_number integer,
  tajwid_rule text,
  can_explain_rule boolean not null default false,
  passed boolean not null default false
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  assigned_to uuid not null references public.profiles(id),
  title text not null,
  description text,
  due_date date,
  status text not null default 'new' check (status in ('new','in_progress','done')),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  work_date date not null default current_date,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  check_type text not null check (check_type in ('lessons','cleaning','admin_tasks')),
  completed boolean not null,
  problem_note text,
  created_at timestamptz not null default now(),
  unique(work_date,reporter_id,check_type),
  check (completed=true or length(trim(coalesce(problem_note,'')))>0)
);

create or replace function public.my_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active=true $$;

create or replace function public.is_assigned_student(p_student uuid,p_subject uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.teacher_assignments a
    join public.students s on s.group_id=a.group_id
    where a.teacher_id=auth.uid() and s.id=p_student and a.subject_id=p_subject
  )
$$;

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.journal_entries enable row level security;
alter table public.quran_progress enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_checkins enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (id=auth.uid() or public.my_role() in ('director','admin'));

drop policy if exists reference_subjects on public.subjects;
create policy reference_subjects on public.subjects for select to authenticated using (true);
drop policy if exists reference_groups on public.groups;
create policy reference_groups on public.groups for select to authenticated using (true);

drop policy if exists students_read on public.students;
create policy students_read on public.students for select to authenticated using (
  public.my_role() in ('director','admin') or exists(
    select 1 from public.teacher_assignments a
    where a.teacher_id=auth.uid() and a.group_id=students.group_id
  )
);

drop policy if exists assignments_read on public.teacher_assignments;
create policy assignments_read on public.teacher_assignments for select to authenticated
using (teacher_id=auth.uid() or public.my_role() in ('director','admin'));

drop policy if exists journal_read on public.journal_entries;
create policy journal_read on public.journal_entries for select to authenticated
using (teacher_id=auth.uid() or public.my_role()='director');
drop policy if exists journal_insert on public.journal_entries;
create policy journal_insert on public.journal_entries for insert to authenticated
with check (teacher_id=auth.uid() and public.my_role()='teacher' and public.is_assigned_student(student_id,subject_id));
drop policy if exists journal_update on public.journal_entries;
create policy journal_update on public.journal_entries for update to authenticated
using (teacher_id=auth.uid() and public.my_role()='teacher')
with check (teacher_id=auth.uid() and public.is_assigned_student(student_id,subject_id));

drop policy if exists quran_read on public.quran_progress;
create policy quran_read on public.quran_progress for select to authenticated using (
  public.my_role()='director' or exists(select 1 from public.journal_entries j where j.id=entry_id and j.teacher_id=auth.uid())
);
drop policy if exists quran_write on public.quran_progress;
create policy quran_write on public.quran_progress for all to authenticated
using (exists(select 1 from public.journal_entries j where j.id=entry_id and j.teacher_id=auth.uid()))
with check (exists(select 1 from public.journal_entries j where j.id=entry_id and j.teacher_id=auth.uid()));

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
using (created_by=auth.uid() or assigned_to=auth.uid() or public.my_role()='director');
drop policy if exists tasks_director_insert on public.tasks;
create policy tasks_director_insert on public.tasks for insert to authenticated
with check (created_by=auth.uid() and public.my_role()='director');
drop policy if exists tasks_assignee_update on public.tasks;
create policy tasks_assignee_update on public.tasks for update to authenticated
using (assigned_to=auth.uid() or created_by=auth.uid());

drop policy if exists daily_checkins_read on public.daily_checkins;
create policy daily_checkins_read on public.daily_checkins for select to authenticated
using (reporter_id=auth.uid() or public.my_role()='director');
drop policy if exists daily_checkins_insert on public.daily_checkins;
create policy daily_checkins_insert on public.daily_checkins for insert to authenticated
with check (
  reporter_id=auth.uid() and (
    (public.my_role()='teacher' and check_type='lessons') or
    (public.my_role()='cleaner' and check_type='cleaning') or
    (public.my_role()='admin' and check_type='admin_tasks')
  )
);
drop policy if exists daily_checkins_update on public.daily_checkins;
create policy daily_checkins_update on public.daily_checkins for update to authenticated
using (reporter_id=auth.uid())
with check (reporter_id=auth.uid());

grant usage on schema public to authenticated;
grant select on public.profiles,public.subjects,public.groups,public.students,public.teacher_assignments to authenticated;
grant select,insert,update on public.journal_entries,public.quran_progress,public.tasks to authenticated;
grant select,insert,update on public.daily_checkins to authenticated;

insert into public.subjects(name,kind) values
('Русский','general'),('Математика','general'),('Татарский','general'),('Арабский','general'),
('Информатика','general'),('Программирование','general'),('Логика','general'),
('История','general'),('Куръан','quran')
on conflict(name) do update set kind=excluded.kind;

-- After creating users in Authentication > Users, assign names and roles:
-- insert into public.profiles(id,full_name,role)
-- select id,'Имя директора','director' from auth.users where email='director@example.com';
-- Repeat for every teacher/admin with their own email and role.
