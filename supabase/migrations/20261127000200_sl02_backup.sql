-- SL-02 / N4: bucket sao luu rieng tu + lich pg_cron 23:00 Chu nhat gio VN (= 16:00 UTC Chu nhat)
insert into storage.buckets (id, name, public) values ('backups', 'backups', false)
on conflict (id) do nothing;

-- Admin cua band chi doc (list + tai bang link co han) file trong thu muc <band_id>/; chi function (service_role) ghi
create policy backups_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = public.my_band_id()::text and public.is_admin());

-- Secret cho cron goi function: sinh ngau nhien trong Vault, khong nam trong repo
create or replace function public.backup_cron_secret()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'backup_cron_secret' limit 1
$$;
revoke execute on function public.backup_cron_secret() from public, anon, authenticated;
grant execute on function public.backup_cron_secret() to service_role;

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'backup_cron_secret', 'x-cron-secret cho weekly-backup')
where not exists (select 1 from vault.secrets where name = 'backup_cron_secret');

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule('weekly-backup', '0 16 * * 0', $c$
  select net.http_post(
    url := 'https://vznmebmqjewdcvjrsfso.supabase.co/functions/v1/weekly-backup',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.backup_cron_secret()),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
$c$);
