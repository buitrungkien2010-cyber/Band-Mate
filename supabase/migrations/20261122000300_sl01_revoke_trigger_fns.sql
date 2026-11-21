-- Ham trigger khong duoc goi qua API
revoke execute on function public.write_audit(), public.link_new_auth_user() from public, anon, authenticated;
