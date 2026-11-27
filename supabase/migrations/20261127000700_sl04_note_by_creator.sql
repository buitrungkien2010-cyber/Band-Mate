-- Q25 (Kien chot 27/11): thanh vien sua Ghi chu cua viec do minh ghi hoac duoc giao cho minh
drop policy tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (band_id = public.my_band_id()
    and (public.is_admin() or assignee_id = public.my_member_id() or created_by = public.my_member_id()))
  with check (band_id = public.my_band_id());

create or replace function public.tasks_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_me uuid := public.my_member_id();
  v_admin boolean := public.is_admin();
  v_core_changed boolean;
begin
  if current_user <> 'authenticated' then return new; end if;

  if tg_op = 'INSERT' then
    new.created_by := v_me;
    new.reopen_count := 0; new.fixed_at := null; new.closed_at := null;
    if new.assignee_id is not null and not v_admin then
      raise exception 'not_allowed: chi Admin gan nguoi nhan';
    end if;
    if not v_admin then new.due_date := null; new.due_rehearsal_id := null; end if;
    new.status := case when new.assignee_id is null then 'new' else 'in_progress' end;
    return new;
  end if;

  if new.band_id is distinct from old.band_id or new.rehearsal_id is distinct from old.rehearsal_id
     or new.created_by is distinct from old.created_by then
    raise exception 'not_allowed: khong doi band / buoi tap / nguoi tao';
  end if;

  v_core_changed := new.content is distinct from old.content or new.assignee_id is distinct from old.assignee_id
    or new.position is distinct from old.position or new.song_version_id is distinct from old.song_version_id
    or new.due_rehearsal_id is distinct from old.due_rehearsal_id or new.due_date is distinct from old.due_date;

  -- Nguoi nhan (ke ca Admin) tick Da sua: in_progress -> pending_review; duoc kem ghi chu
  if old.status = 'in_progress' and new.status = 'pending_review' then
    if old.assignee_id is distinct from v_me then raise exception 'not_allowed: chi nguoi nhan tick Da sua'; end if;
    if v_core_changed then raise exception 'not_allowed: tick Da sua khong doi noi dung'; end if;
    new.fixed_at := now(); new.reopen_count := old.reopen_count; new.closed_at := null;
    return new;
  end if;

  if not v_admin then
    -- Q25: chi duoc sua Ghi chu cua viec do minh ghi hoac duoc giao cho minh
    if (old.assignee_id = v_me or old.created_by = v_me) and new.status = old.status
       and old.status <> 'cancelled' and not v_core_changed then
      new.fixed_at := old.fixed_at; new.reopen_count := old.reopen_count; new.closed_at := old.closed_at;
      return new;
    end if;
    raise exception 'not_allowed: thanh vien chi tick viec cua minh / ghi chu viec minh ghi hoac duoc giao';
  end if;

  new.fixed_at := old.fixed_at; new.reopen_count := old.reopen_count; new.closed_at := old.closed_at;
  if old.status = new.status then
    if old.status = 'cancelled' then raise exception 'not_allowed: viec da huy'; end if;
    if old.status = 'closed' and v_core_changed then raise exception 'not_allowed: viec da dong'; end if;
    if old.status = 'in_progress' and new.assignee_id is null then raise exception 'need_assignee'; end if;
    if old.status = 'new' and new.assignee_id is not null then new.status := 'in_progress'; end if;
    return new;
  end if;

  if old.status = 'new' and new.status = 'in_progress' then
    if new.assignee_id is null then raise exception 'need_assignee'; end if;
  elsif old.status = 'pending_review' and new.status = 'closed' then
    new.closed_at := now();
  elsif old.status = 'pending_review' and new.status = 'in_progress' then
    new.reopen_count := old.reopen_count + 1; new.fixed_at := null;
  elsif old.status in ('new', 'in_progress') and new.status = 'cancelled' then
    null;
  else
    raise exception 'invalid_transition: % -> %', old.status, new.status;
  end if;
  return new;
end $$;
