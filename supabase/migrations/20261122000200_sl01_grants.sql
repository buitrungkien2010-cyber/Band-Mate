-- Project moi khong tu cap quyen bang cho authenticated; cap toi thieu, RLS van chan theo dong
grant select, update on public.bands to authenticated;
grant select, insert, update on public.members to authenticated;
grant select on public.audit_log to authenticated;
