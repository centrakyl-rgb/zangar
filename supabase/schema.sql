create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'teacher')),
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  group_name text not null,
  parent_name text,
  parent_phone text,
  note text,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid references public.profiles(id) on delete set null,
  grade smallint not null check (grade between 2 and 5),
  lesson_date date not null default current_date,
  comment text,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  lesson_date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'late')),
  comment text,
  created_at timestamptz not null default now()
);

create table public.illnesses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  started_at date not null,
  ended_at date,
  has_certificate boolean not null default false,
  comment text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  planned_at timestamptz not null,
  target text not null default 'parents' check (target in ('parents', 'teachers', 'admins')),
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.illnesses enable row level security;
alter table public.notifications enable row level security;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "staff can read profiles"
on public.profiles for select
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy "admins can manage profiles"
on public.profiles for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "staff can read students"
on public.students for select
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy "admins can manage students"
on public.students for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "staff can read subjects"
on public.subjects for select
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy "admins can manage subjects"
on public.subjects for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "staff can read grades"
on public.grades for select
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy "staff can manage grades"
on public.grades for all
to authenticated
using (public.current_user_role() in ('admin', 'teacher'))
with check (public.current_user_role() in ('admin', 'teacher'));

create policy "staff can read attendance"
on public.attendance for select
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy "staff can manage attendance"
on public.attendance for all
to authenticated
using (public.current_user_role() in ('admin', 'teacher'))
with check (public.current_user_role() in ('admin', 'teacher'));

create policy "staff can read illnesses"
on public.illnesses for select
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy "staff can manage illnesses"
on public.illnesses for all
to authenticated
using (public.current_user_role() in ('admin', 'teacher'))
with check (public.current_user_role() in ('admin', 'teacher'));

create policy "staff can read notifications"
on public.notifications for select
to authenticated
using (public.current_user_role() in ('admin', 'teacher'));

create policy "staff can manage notifications"
on public.notifications for all
to authenticated
using (public.current_user_role() in ('admin', 'teacher'))
with check (public.current_user_role() in ('admin', 'teacher'));

insert into public.subjects (name) values
  ('Русский'),
  ('Математика'),
  ('Татарский'),
  ('Арабский'),
  ('Информатика'),
  ('Программирование'),
  ('Логика'),
  ('История')
on conflict (name) do nothing;
