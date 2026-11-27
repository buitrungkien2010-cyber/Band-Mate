-- SL-02: songs, song_versions (ENT-03, ENT-04) + nhap Master file 1 lan (US-03, PRD 9.2)

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id),
  title text not null,
  artist text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index songs_band_idx on public.songs (band_id);
create unique index songs_uq on public.songs (band_id, lower(title), lower(coalesce(artist, '')));

create table public.song_versions (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id),
  song_id uuid not null references public.songs(id),
  label text,                       -- phan trong ngoac o ten bai Master file, vd "Gm", "Ferry Aid version"
  song_key text,                    -- tone
  tempo int check (tempo is null or tempo between 20 and 400),
  duration_sec int check (duration_sec is null or duration_sec between 1 and 7200),
  duration_estimated boolean not null default false,  -- 0:04:32 = gia tri mac dinh chua do
  difficulty text check (difficulty in ('easy','medium','hard')),
  progress int check (progress in (0, 50, 80, 100)),
  note text,
  lyrics_url text,
  chord_url text,                   -- cot G "Chord": rhythm chart chung
  youtube_url text,
  parts jsonb,                      -- phan vai tho tu Master file, dung o lat 1b
  source_no int,                    -- cot "No" trong Songlist
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index song_versions_song_idx on public.song_versions (song_id);
create index song_versions_band_idx on public.song_versions (band_id);

create trigger songs_updated_at before update on public.songs
  for each row execute function public.set_updated_at();
create trigger song_versions_updated_at before update on public.song_versions
  for each row execute function public.set_updated_at();
create trigger songs_audit after insert or update or delete on public.songs
  for each row execute function public.write_audit();
create trigger song_versions_audit after insert or update or delete on public.song_versions
  for each row execute function public.write_audit();

alter table public.songs enable row level security;
alter table public.song_versions enable row level security;

create policy songs_select on public.songs for select to authenticated using (band_id = public.my_band_id());
create policy songs_insert on public.songs for insert to authenticated with check (band_id = public.my_band_id() and public.is_admin());
create policy songs_update on public.songs for update to authenticated
  using (band_id = public.my_band_id() and public.is_admin()) with check (band_id = public.my_band_id() and public.is_admin());

create policy versions_select on public.song_versions for select to authenticated using (band_id = public.my_band_id());
create policy versions_insert on public.song_versions for insert to authenticated with check (band_id = public.my_band_id() and public.is_admin());
create policy versions_update on public.song_versions for update to authenticated
  using (band_id = public.my_band_id() and public.is_admin()) with check (band_id = public.my_band_id() and public.is_admin());

revoke all on public.songs, public.song_versions from anon;
revoke delete, truncate on public.songs, public.song_versions from authenticated;
grant select, insert, update on public.songs, public.song_versions to authenticated;

-- ---------- Nhap Master file: 1 giao dich, co loi la khong ghi gi ----------
-- p_versions: [{row, title, artist, label, key, tempo, duration_sec, duration_estimated, difficulty, progress,
--               note, lyrics_url, chord_url, youtube_url, parts, source_no}]
-- p_members:  [{nickname, username, main_skill}]
create or replace function public.import_master(p_versions jsonb, p_members jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_band uuid := public.my_band_id();
  v jsonb;
  m jsonb;
  v_song uuid;
  n_songs int := 0; n_versions int := 0; n_members int := 0; n_skipped int := 0;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if exists (select 1 from public.songs where band_id = v_band) then
    raise exception 'already_imported: kho bai da co du lieu';
  end if;
  if jsonb_typeof(p_versions) <> 'array' or jsonb_array_length(p_versions) = 0 then
    raise exception 'empty_file';
  end if;

  for m in select * from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) loop
    if exists (select 1 from public.members x where x.band_id = v_band and lower(x.nickname) = lower(m ->> 'nickname')) then
      n_skipped := n_skipped + 1;
    else
      insert into public.members (band_id, nickname, username, main_skill)
      values (v_band, m ->> 'nickname', m ->> 'username', nullif(m ->> 'main_skill', ''));
      n_members := n_members + 1;
    end if;
  end loop;

  for v in select * from jsonb_array_elements(p_versions) loop
    select s.id into v_song from public.songs s
      where s.band_id = v_band and lower(s.title) = lower(v ->> 'title')
        and lower(coalesce(s.artist, '')) = lower(coalesce(v ->> 'artist', ''));
    if v_song is null then
      insert into public.songs (band_id, title, artist)
      values (v_band, v ->> 'title', nullif(v ->> 'artist', '')) returning id into v_song;
      n_songs := n_songs + 1;
    end if;
    insert into public.song_versions (band_id, song_id, label, song_key, tempo, duration_sec, duration_estimated,
      difficulty, progress, note, lyrics_url, chord_url, youtube_url, parts, source_no)
    values (v_band, v_song, nullif(v ->> 'label', ''), nullif(v ->> 'key', ''), (v ->> 'tempo')::int,
      (v ->> 'duration_sec')::int, coalesce((v ->> 'duration_estimated')::boolean, false),
      nullif(v ->> 'difficulty', ''), (v ->> 'progress')::int, nullif(v ->> 'note', ''),
      nullif(v ->> 'lyrics_url', ''), nullif(v ->> 'chord_url', ''), nullif(v ->> 'youtube_url', ''),
      v -> 'parts', (v ->> 'source_no')::int);
    n_versions := n_versions + 1;
    v_song := null;
  end loop;

  return jsonb_build_object('songs', n_songs, 'versions', n_versions, 'members', n_members, 'members_skipped', n_skipped);
end $$;

revoke execute on function public.import_master(jsonb, jsonb) from public, anon;
grant execute on function public.import_master(jsonb, jsonb) to authenticated;
