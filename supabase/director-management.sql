-- Allows the director to manage groups, students and teacher assignments in the app.
drop policy if exists groups_director_write on public.groups;
create policy groups_director_write on public.groups for all to authenticated
using (public.my_role()='director') with check (public.my_role()='director');

drop policy if exists students_director_write on public.students;
create policy students_director_write on public.students for all to authenticated
using (public.my_role()='director') with check (public.my_role()='director');

drop policy if exists assignments_director_write on public.teacher_assignments;
create policy assignments_director_write on public.teacher_assignments for all to authenticated
using (public.my_role()='director') with check (public.my_role()='director');

grant insert,update,delete on public.groups,public.students,public.teacher_assignments to authenticated;
