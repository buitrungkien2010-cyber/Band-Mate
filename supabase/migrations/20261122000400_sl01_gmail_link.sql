-- Cho phep dang nhap bang link gui vao Gmail (nguoi co Gmail trong members).
-- Dung de Admin vao lan dau truoc khi cau hinh Google OAuth; cung tai khoan se tu lien ket khi dang nhap Google sau nay.
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email    text := lower(event -> 'user' ->> 'email');
  v_ok       boolean;
begin
  select exists (
    select 1 from public.members m
    where m.is_active and (
      (lower(m.email) = v_email and m.google_user_id is null)
      or (m.username is not null and m.login_user_id is null
          and lower(m.username) || '@tamband.local' = v_email)
    )
  ) into v_ok;

  if v_ok then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'not_member'));
end $$;

create or replace function public.link_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(new.email);
begin
  update public.members set google_user_id = new.id
  where lower(email) = v_email and google_user_id is null and is_active;
  update public.members set login_user_id = new.id
  where lower(username) || '@tamband.local' = v_email and login_user_id is null and is_active;
  return new;
end $$;

revoke execute on function public.link_new_auth_user() from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
