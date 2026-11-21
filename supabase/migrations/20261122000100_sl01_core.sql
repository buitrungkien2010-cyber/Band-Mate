-- SL-01: bands, members, audit_log + RLS + auth gate
-- PRD_BandMate_v1.0: muc 3.2, 6 (ENT-01, ENT-02, ENT-10), 8 (N1, N2, N5)

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- tables ----------
create table public.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id),
  google_user_id uuid unique references auth.users(id),
  login_user_id uuid unique references auth.users(id),
  nickname text not null,
  full_name text,
  email text,          -- Gmail dung dang nhap Google
  username text,       -- dang nhap username + mat khau
  role text not null default 'member' check (role in ('admin', 'member')),
  main_skill text check (main_skill in ('vocal','drum','bass','guitar_rhythm','guitar_lead','keyboard','sax')),
  ui_language text not null default 'vi' check (ui_language in ('vi', 'en')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_login_required check (email is not null or username is not null),
  constraint members_username_format check (username is null or username ~ '^[a-z0-9._-]{3,30}$')
);
create unique index members_email_uq on public.members (lower(email)) where email is not null;
create unique index members_username_uq on public.members (lower(username)) where username is not null;
create index members_band_idx on public.members (band_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  band_id uuid references public.bands(id),
  actor_id uuid references public.members(id),
  table_name text not null,
  row_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_log_band_idx on public.audit_log (band_id, created_at desc);

create trigger bands_updated_at before update on public.bands
  for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();

-- ---------- identity helpers (security definer, tranh de quy RLS) ----------
create or replace function public.my_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.members m
  where m.is_active and (m.google_user_id = auth.uid() or m.login_user_id = auth.uid())
  limit 1
$$;

create or replace function public.my_band_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.band_id from public.members m
  where m.is_active and (m.google_user_id = auth.uid() or m.login_user_id = auth.uid())
  limit 1
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.is_active and m.role = 'admin'
      and (m.google_user_id = auth.uid() or m.login_user_id = auth.uid())
  )
$$;

revoke execute on function public.my_member_id(), public.my_band_id(), public.is_admin() from public, anon;
grant execute on function public.my_member_id(), public.my_band_id(), public.is_admin() to authenticated;

-- ---------- audit trigger (ENT-10) ----------
create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_band uuid;
  v_row  text;
begin
  if tg_table_name = 'bands' then
    v_band := coalesce(new.id, old.id);
  else
    v_band := coalesce((to_jsonb(new) ->> 'band_id')::uuid, (to_jsonb(old) ->> 'band_id')::uuid);
  end if;
  v_row := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');
  insert into public.audit_log (band_id, actor_id, table_name, row_id, action, old_value, new_value)
  values (
    v_band, public.my_member_id(), tg_table_name, v_row, lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger bands_audit after insert or update or delete on public.bands
  for each row execute function public.write_audit();
create trigger members_audit after insert or update or delete on public.members
  for each row execute function public.write_audit();

-- ---------- guard: thanh vien chi sua truong cua minh; luon con >=1 admin ----------
create or replace function public.members_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.username is distinct from old.username
       or new.is_active is distinct from old.is_active
       or new.band_id is distinct from old.band_id
       or new.google_user_id is distinct from old.google_user_id
       or new.login_user_id is distinct from old.login_user_id then
      raise exception 'not_allowed: thanh vien chi sua ten goi, ho ten, kha nang, ngon ngu';
    end if;
  end if;

  if current_user = 'authenticated'
     and (new.email is distinct from old.email and old.google_user_id is not null) then
    raise exception 'email_locked: Gmail da lien ket, khong doi duoc';
  end if;
  if current_user = 'authenticated'
     and (new.username is distinct from old.username and old.login_user_id is not null) then
    raise exception 'username_locked: username da tao tai khoan, khong doi duoc';
  end if;

  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active) then
    if not exists (
      select 1 from public.members m
      where m.band_id = old.band_id and m.id <> old.id and m.role = 'admin' and m.is_active
    ) then
      raise exception 'last_admin: band phai con it nhat 1 Admin';
    end if;
  end if;
  return new;
end $$;

create trigger members_guard before update on public.members
  for each row execute function public.members_guard();

-- ---------- RLS ----------
alter table public.bands enable row level security;
alter table public.members enable row level security;
alter table public.audit_log enable row level security;

create policy bands_select on public.bands for select to authenticated
  using (id = public.my_band_id());
create policy bands_update on public.bands for update to authenticated
  using (id = public.my_band_id() and public.is_admin())
  with check (id = public.my_band_id() and public.is_admin());

create policy members_select on public.members for select to authenticated
  using (band_id = public.my_band_id());
create policy members_insert on public.members for insert to authenticated
  with check (band_id = public.my_band_id() and public.is_admin());
create policy members_update on public.members for update to authenticated
  using (band_id = public.my_band_id() and (public.is_admin() or id = public.my_member_id()))
  with check (band_id = public.my_band_id() and (public.is_admin() or id = public.my_member_id()));

create policy audit_select on public.audit_log for select to authenticated
  using (band_id = public.my_band_id() and public.is_admin());

-- Khong xoa cung (quy tac A6): khong co policy DELETE, thu hoi luon quyen
revoke delete, truncate on public.bands, public.members, public.audit_log from anon, authenticated;
revoke insert, update on public.audit_log from anon, authenticated;
revoke all on public.bands, public.members, public.audit_log from anon;

-- ---------- Auth gate (US-01): chi cho tao tai khoan neu co trong members ----------
-- Bat trong Supabase Dashboard: Authentication -> Hooks -> Before User Created -> public.hook_before_user_created
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email    text := lower(event -> 'user' ->> 'email');
  v_provider text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', 'email');
  v_ok       boolean;
begin
  if v_provider = 'google' then
    select exists (
      select 1 from public.members m
      where m.is_active and lower(m.email) = v_email and m.google_user_id is null
    ) into v_ok;
  else
    select exists (
      select 1 from public.members m
      where m.is_active and m.username is not null and m.login_user_id is null
        and lower(m.username) || '@tamband.local' = v_email
    ) into v_ok;
  end if;

  if v_ok then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'not_member'
  ));
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;

-- Lien ket tai khoan auth vua tao voi dong members
create or replace function public.link_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(new.email);
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'google' then
    update public.members set google_user_id = new.id
    where lower(email) = v_email and google_user_id is null and is_active;
  else
    update public.members set login_user_id = new.id
    where lower(username) || '@tamband.local' = v_email and login_user_id is null and is_active;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.link_new_auth_user();
