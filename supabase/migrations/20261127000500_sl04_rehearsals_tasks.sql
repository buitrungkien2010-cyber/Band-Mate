-- SL-04: buoi tap (ENT rehearsals) + nhan xet / viec (tasks), vong doi viec, K2 (US-05 -> US-10)

create table public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id),
  starts_at timestamptz not null,
  location text,
  song_version_ids uuid[] not null default '{}',   -- bai se tap (P0: khong them bang noi)
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rehearsals_band_idx on public.rehearsals (band_id, starts_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id),
  rehearsal_id uuid not null references public.rehearsals(id),
  song_version_id uuid references public.song_versions(id),       -- null = nhan xet chung
  position text not null default 'general'
    check (position in ('vocal','drum','bass','guitar_rhythm','guitar_lead','keyboard','sax','general')),
  content text not null check (length(trim(content)) > 0),
  status text not null default 'new' check (status in ('new','in_progress','pending_review','closed','cancelled')),
  assignee_id uuid references public.members(id),
  due_rehearsal_id uuid references public.rehearsals(id),          -- null = buoi tap ke tiep
  reopen_count int not null default 0,
  fixed_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_band_idx on public.tasks (band_id, status);
create index tasks_rehearsal_idx on public.tasks (rehearsal_id);
create index tasks_assignee_idx on public.tasks (assignee_id, status);

create trigger rehearsals_updated_at before update on public.rehearsals for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger rehearsals_audit after insert or update or delete on public.rehearsals for each row execute function public.write_audit();
create trigger tasks_audit after insert or update or delete on public.tasks for each row execute function public.write_audit();

-- ---------- Luat vong doi viec (chan o database, khong chi an nut) ----------
create or replace function public.tasks_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_me uuid := public.my_member_id();
  v_admin boolean := public.is_admin();
begin
  if current_user <> 'authenticated' then return new; end if;  -- service_role / migration

  if tg_op = 'INSERT' then
    new.created_by := v_me;
    new.reopen_count := 0; new.fixed_at := null; new.closed_at := null;
    if new.assignee_id is not null and not v_admin then
      raise exception 'not_allowed: chi Admin gan nguoi nhan';
    end if;
    new.status := case when new.assignee_id is null then 'new' else 'in_progress' end;
    return new;
  end if;

  -- UPDATE
  if new.band_id is distinct from old.band_id or new.rehearsal_id is distinct from old.rehearsal_id
     or new.created_by is distinct from old.created_by then
    raise exception 'not_allowed: khong doi band / buoi tap / nguoi tao';
  end if;

  -- Nguoi nhan (ke ca Admin) tick Da sua: in_progress -> pending_review, khong doi gi khac
  if old.status = 'in_progress' and new.status = 'pending_review' then
    if old.assignee_id is distinct from v_me then raise exception 'not_allowed: chi nguoi nhan tick Da sua'; end if;
    if new.content is distinct from old.content or new.assignee_id is distinct from old.assignee_id
       or new.position is distinct from old.position or new.song_version_id is distinct from old.song_version_id
       or new.due_rehearsal_id is distinct from old.due_rehearsal_id then
      raise exception 'not_allowed: tick Da sua khong doi noi dung';
    end if;
    new.fixed_at := now(); new.reopen_count := old.reopen_count; new.closed_at := null;
    return new;
  end if;

  if not v_admin then raise exception 'not_allowed: thanh vien chi tick viec cua minh'; end if;

  new.fixed_at := old.fixed_at; new.reopen_count := old.reopen_count; new.closed_at := old.closed_at;
  if old.status = new.status then
    if old.status in ('closed', 'cancelled') then raise exception 'not_allowed: viec da dong / huy'; end if;
    if old.status = 'in_progress' and new.assignee_id is null then raise exception 'need_assignee'; end if;
    if old.status = 'new' and new.assignee_id is not null then new.status := 'in_progress'; end if;  -- gan nguoi
    return new;
  end if;

  if old.status = 'new' and new.status = 'in_progress' then
    if new.assignee_id is null then raise exception 'need_assignee'; end if;
  elsif old.status = 'pending_review' and new.status = 'closed' then
    new.closed_at := now();
  elsif old.status = 'pending_review' and new.status = 'in_progress' then   -- Mo lai
    new.reopen_count := old.reopen_count + 1; new.fixed_at := null;
  elsif old.status in ('new', 'in_progress') and new.status = 'cancelled' then
    null;
  else
    raise exception 'invalid_transition: % -> %', old.status, new.status;
  end if;
  return new;
end $$;

create trigger tasks_guard before insert or update on public.tasks for each row execute function public.tasks_guard();

-- ---------- RLS ----------
alter table public.rehearsals enable row level security;
alter table public.tasks enable row level security;

create policy rehearsals_select on public.rehearsals for select to authenticated using (band_id = public.my_band_id());
create policy rehearsals_insert on public.rehearsals for insert to authenticated with check (band_id = public.my_band_id() and public.is_admin());
create policy rehearsals_update on public.rehearsals for update to authenticated
  using (band_id = public.my_band_id() and public.is_admin()) with check (band_id = public.my_band_id() and public.is_admin());

create policy tasks_select on public.tasks for select to authenticated using (band_id = public.my_band_id());
create policy tasks_insert on public.tasks for insert to authenticated with check (band_id = public.my_band_id());
create policy tasks_update on public.tasks for update to authenticated
  using (band_id = public.my_band_id() and (public.is_admin() or assignee_id = public.my_member_id()))
  with check (band_id = public.my_band_id());

revoke all on public.rehearsals, public.tasks from anon;
revoke delete, truncate on public.rehearsals, public.tasks from authenticated;
grant select, insert, update on public.rehearsals, public.tasks to authenticated;
grant select on public.rehearsals, public.tasks to service_role;  -- sao luu tuan

-- ---------- K2 theo tung buoi tap (1 ham dung chung) ----------
-- assigned_pct = viec co nguoi nhan / tong nhan xet (bo viec huy)
-- fixed_pct    = viec co fixed_at truoc gio bat dau buoi ke tiep / viec co nguoi nhan
--                (chua co buoi ke tiep -> tinh den hien tai, has_next = false)
create or replace function public.k2_by_rehearsal()
returns table (rehearsal_id uuid, starts_at timestamptz, next_starts_at timestamptz, has_next boolean,
  comments int, assigned int, fixed_before_next int, assigned_pct numeric, fixed_pct numeric)
language sql stable security invoker set search_path = '' as $$
  with r as (
    select x.id, x.starts_at,
      lead(x.starts_at) over (order by x.starts_at) as next_at
    from public.rehearsals x
    where x.band_id = public.my_band_id() and x.status = 'scheduled'
  ), t as (
    select r.id, r.starts_at, r.next_at,
      count(k.id) filter (where k.status <> 'cancelled')::int as comments,
      count(k.id) filter (where k.status <> 'cancelled' and k.assignee_id is not null)::int as assigned,
      count(k.id) filter (where k.status <> 'cancelled' and k.assignee_id is not null and k.fixed_at is not null
        and k.fixed_at < coalesce(r.next_at, now()))::int as fixed_ok
    from r left join public.tasks k on k.rehearsal_id = r.id
    group by r.id, r.starts_at, r.next_at
  )
  select id, starts_at, next_at, next_at is not null, comments, assigned, fixed_ok,
    case when comments = 0 then null else round(100.0 * assigned / comments, 0) end,
    case when assigned = 0 then null else round(100.0 * fixed_ok / assigned, 0) end
  from t order by starts_at desc
$$;
revoke execute on function public.k2_by_rehearsal() from public, anon;
grant execute on function public.k2_by_rehearsal() to authenticated;
