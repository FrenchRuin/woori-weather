-- 우리동네 날씨 — 초기 스키마 (SPEC §4 + 2026-10-02 결정 사항)
--
-- 커스텀 에러 코드 (API 에서 HTTP 상태로 매핑)
--   WW429  한마디 1분 1개 제한 (R9)          → 429
--   WW409  닉네임 30일 내 재변경 (R4)        → 409
--   WW403  프로필 없음                       → 403
--   23505  unique 위반 (닉네임 중복, 중복 신고) → 409

-- ─────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────

create table public.dongs (
  code      text primary key check (code ~ '^[0-9]{10}$'),
  name      text not null,
  full_name text not null,
  lat       double precision not null,
  lng       double precision not null,
  nx        int not null,
  ny        int not null
);

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  nickname            text not null check (nickname ~ '^[가-힣A-Za-z0-9]{2,10}$'),
  dong_code           text not null references public.dongs (code),
  nickname_changed_at timestamptz,
  created_at          timestamptz not null default now()
);

-- 대소문자만 다른 닉네임도 중복으로 본다 (R3)
create unique index profiles_nickname_key on public.profiles (lower(nickname));

create table public.weather_cache (
  nx         int not null,
  ny         int not null,
  data       jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (nx, ny)
);

create table public.reactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  dong_code  text not null references public.dongs (code),
  feel       text not null check (feel in ('cold', 'good', 'hot')),
  tags       text[] not null default '{}'
             check (tags <@ array['rain', 'wind', 'clear']::text[]),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reactions_dong_created_idx on public.reactions (dong_code, created_at desc);
create index reactions_user_created_idx on public.reactions (user_id, created_at desc);

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  dong_code    text not null references public.dongs (code),
  -- R8: 1~200자, 앞뒤 공백은 API 에서 제거 후 저장
  content      text not null
               check (char_length(content) between 1 and 200 and content !~ '^\s|\s$'),
  tag          text check (tag in ('rain', 'wind', 'temp', 'sun')),
  like_count   int not null default 0,
  report_count int not null default 0,
  is_hidden    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index posts_dong_created_idx on public.posts (dong_code, created_at desc);
create index posts_dong_likes_idx on public.posts (dong_code, like_count desc);
create index posts_user_created_idx on public.posts (user_id, created_at desc);

create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on public.post_likes (user_id);

create table public.reports (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  reason     text not null check (reason in ('abuse', 'ad', 'off_topic', 'etc')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id) -- 1인 1회 (R12)
);

create index reports_user_idx on public.reports (user_id);

-- ─────────────────────────────────────────────
-- 트리거
-- ─────────────────────────────────────────────

-- profiles: 서버가 관리하는 컬럼 보호 + R4 (닉네임 30일 1회)
create function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.nickname_changed_at := null;
    new.created_at := now();
    return new;
  end if;

  new.id := old.id;
  new.created_at := old.created_at;
  new.nickname_changed_at := old.nickname_changed_at;

  if new.nickname is distinct from old.nickname then
    if old.nickname_changed_at is not null
       and old.nickname_changed_at > now() - interval '30 days' then
      raise exception 'nickname can be changed once every 30 days'
        using errcode = 'WW409';
    end if;
    new.nickname_changed_at := now();
  end if;

  return new;
end;
$$;

create trigger profiles_before_write
before insert or update on public.profiles
for each row execute function public.profiles_before_write();

-- reactions: 수정 시 user_id / dong_code / created_at 고정, updated_at 갱신
create function public.reactions_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.dong_code := old.dong_code;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger reactions_before_update
before update on public.reactions
for each row execute function public.reactions_before_update();

-- posts: 카운터/숨김/작성시각은 서버만 관리 + R9 (1분에 1개)
create function public.posts_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.like_count := 0;
  new.report_count := 0;
  new.is_hidden := false;
  new.created_at := now();

  -- 같은 사용자의 동시 요청 직렬화
  perform pg_advisory_xact_lock(hashtextextended('post:' || new.user_id::text, 0));

  if exists (
    select 1 from public.posts
    where user_id = new.user_id
      and created_at > now() - interval '1 minute'
  ) then
    raise exception 'only one post per minute'
      using errcode = 'WW429';
  end if;

  return new;
end;
$$;

create trigger posts_before_insert
before insert on public.posts
for each row execute function public.posts_before_insert();

-- post_likes → posts.like_count ±1
-- posts 에는 사용자 update 정책이 없으므로 security definer 로 갱신한다.
create function public.post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
end;
$$;

create trigger post_likes_count
after insert or delete on public.post_likes
for each row execute function public.post_likes_count();

-- reports → posts.report_count +1, 3건 이상이면 숨김 (R12)
-- 탈퇴로 신고 행이 지워져도 report_count / is_hidden 은 되돌리지 않는다.
create function public.reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set report_count = report_count + 1,
      is_hidden = is_hidden or report_count + 1 >= 3
  where id = new.post_id;
  return new;
end;
$$;

create trigger reports_after_insert
after insert on public.reports
for each row execute function public.reports_after_insert();

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────

alter table public.dongs enable row level security;
alter table public.profiles enable row level security;
alter table public.weather_cache enable row level security;
alter table public.reactions enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.reports enable row level security;

-- dongs: 누구나 읽기, 쓰기는 service role 만 (정책 없음)
create policy "dongs: read" on public.dongs
for select to anon, authenticated using (true);

-- profiles: 원본은 본인 행만. 남의 정보는 public_profiles view 로만 노출
create policy "profiles: read own" on public.profiles
for select to authenticated using (id = (select auth.uid()));

create policy "profiles: insert own" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- weather_cache: 정책 없음 → service role 만 접근

-- reactions
create policy "reactions: read" on public.reactions
for select to authenticated using (true);

-- R5: 현재 내 동네에만 투표
create policy "reactions: insert own" on public.reactions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and dong_code = (select p.dong_code from public.profiles p where p.id = (select auth.uid()))
);

-- R6: 작성 후 1시간 안에만 수정
create policy "reactions: update own within 1h" on public.reactions
for update to authenticated
using (user_id = (select auth.uid()) and created_at > now() - interval '1 hour')
with check (user_id = (select auth.uid()));

-- posts: 숨김 글은 작성자 본인만 보인다
create policy "posts: read visible or own" on public.posts
for select to authenticated
using (not is_hidden or user_id = (select auth.uid()));

create policy "posts: insert own" on public.posts
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and dong_code = (select p.dong_code from public.profiles p where p.id = (select auth.uid()))
);

create policy "posts: delete own" on public.posts
for delete to authenticated using (user_id = (select auth.uid()));

-- post_likes: 보이는 글에만 공감 (R11)
create policy "post_likes: read" on public.post_likes
for select to authenticated using (true);

create policy "post_likes: insert own" on public.post_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id)
);

create policy "post_likes: delete own" on public.post_likes
for delete to authenticated using (user_id = (select auth.uid()));

-- reports: 본인 것만 조회, 보이는 남의 글만 신고 (R12)
create policy "reports: read own" on public.reports
for select to authenticated using (user_id = (select auth.uid()));

create policy "reports: insert own, not on own post" on public.reports
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id <> (select auth.uid())
  )
);

-- ─────────────────────────────────────────────
-- 권한 (anon 은 dongs 읽기 외 접근 불가)
-- ─────────────────────────────────────────────

revoke all on public.profiles, public.weather_cache, public.reactions,
  public.posts, public.post_likes, public.reports from anon;
revoke all on public.weather_cache from authenticated;
revoke insert, update, delete on public.dongs from anon, authenticated;

-- ─────────────────────────────────────────────
-- View
-- ─────────────────────────────────────────────

-- 공개 프로필: 닉네임과 동네만. view 소유자 권한으로 실행되어 profiles RLS 를 우회한다.
create view public.public_profiles
with (security_invoker = false) as
select id, nickname, dong_code from public.profiles;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;

-- 한마디 피드: posts RLS(숨김 처리)는 호출자 기준으로 적용된다.
create view public.post_feed
with (security_invoker = true) as
select
  p.id,
  p.dong_code,
  p.user_id,
  pp.nickname,
  p.content,
  p.tag,
  p.like_count,
  p.is_hidden,
  p.created_at,
  exists (
    select 1 from public.post_likes l
    where l.post_id = p.id and l.user_id = (select auth.uid())
  ) as liked_by_me,
  p.user_id = (select auth.uid()) as is_mine
from public.posts p
join public.public_profiles pp on pp.id = p.user_id;

revoke all on public.post_feed from anon, authenticated;
grant select on public.post_feed to authenticated;

-- ─────────────────────────────────────────────
-- 함수 (RPC)
-- ─────────────────────────────────────────────

-- R6: 최근 1시간 내 같은 동네 투표가 있으면 update, 없으면 insert
create function public.submit_reaction(p_feel text, p_tags text[])
returns public.reactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_dong text;
  v_tags text[] := coalesce(
    array(select distinct t from unnest(p_tags) as t order by t), '{}'
  );
  v_row  public.reactions;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select dong_code into v_dong from public.profiles where id = v_uid;
  if v_dong is null then
    raise exception 'profile required' using errcode = 'WW403';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reaction:' || v_uid::text, 0));

  update public.reactions
  set feel = p_feel, tags = v_tags
  where id = (
    select id from public.reactions
    where user_id = v_uid
      and dong_code = v_dong
      and created_at > now() - interval '1 hour'
    order by created_at desc
    limit 1
  )
  returning * into v_row;

  if not found then
    insert into public.reactions (user_id, dong_code, feel, tags)
    values (v_uid, v_dong, p_feel, v_tags)
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- R7: 최근 1시간 동네 체감 집계
create function public.reaction_summary(p_dong_code text)
returns table (
  total int, cold int, good int, hot int, rain int, wind int, clear int
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*)::int,
    (count(*) filter (where feel = 'cold'))::int,
    (count(*) filter (where feel = 'good'))::int,
    (count(*) filter (where feel = 'hot'))::int,
    (count(*) filter (where 'rain' = any (tags)))::int,
    (count(*) filter (where 'wind' = any (tags)))::int,
    (count(*) filter (where 'clear' = any (tags)))::int
  from public.reactions
  where dong_code = p_dong_code
    and created_at > now() - interval '1 hour';
$$;

revoke execute on function public.submit_reaction(text, text[]) from public, anon;
revoke execute on function public.reaction_summary(text) from public, anon;
grant execute on function public.submit_reaction(text, text[]) to authenticated;
grant execute on function public.reaction_summary(text) to authenticated;

-- 트리거 함수는 직접 호출할 일이 없다
revoke execute on function public.profiles_before_write() from public, anon, authenticated;
revoke execute on function public.reactions_before_update() from public, anon, authenticated;
revoke execute on function public.posts_before_insert() from public, anon, authenticated;
revoke execute on function public.post_likes_count() from public, anon, authenticated;
revoke execute on function public.reports_after_insert() from public, anon, authenticated;
