-- Run once after schema.sql. Enables self-registration and director approval.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare first_profile boolean;
begin
  select not exists(select 1 from public.profiles) into first_profile;
  insert into public.profiles(id,full_name,role,active)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),
    case when first_profile then 'director'::public.app_role else 'teacher'::public.app_role end,
    first_profile
  )
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- If a user was already created before this update, make the earliest one director.
insert into public.profiles(id,full_name,role,active)
select u.id,coalesce(u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1)),'director',true
from auth.users u
where not exists(select 1 from public.profiles)
order by u.created_at
limit 1
on conflict(id) do update set role='director',active=true;

create or replace function public.approve_staff(
  p_user uuid,
  p_role public.app_role,
  p_name text
) returns void language plpgsql security definer set search_path=public
as $$
begin
  if public.my_role()<>'director' then raise exception 'Only director can approve staff'; end if;
  if p_role not in ('teacher','admin','cleaner') then raise exception 'Invalid staff role'; end if;
  update public.profiles set role=p_role,full_name=trim(p_name),active=true where id=p_user;
end $$;

drop policy if exists profiles_director_update on public.profiles;
create policy profiles_director_update on public.profiles for update to authenticated
using (public.my_role()='director') with check (public.my_role()='director');

grant update on public.profiles to authenticated;
grant execute on function public.approve_staff(uuid,public.app_role,text) to authenticated;
