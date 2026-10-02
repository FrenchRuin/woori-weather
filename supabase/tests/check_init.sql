-- 트리거 / RLS 동작 확인 스크립트
--
-- Supabase SQL Editor 에 통째로 붙여 넣고 실행한다.
-- 전부 한 트랜잭션 안에서 돌고 마지막에 rollback 하므로 데이터가 남지 않는다.
-- 각 단계가 기대와 다르면 'FAIL: ...' 예외로 멈추고, 끝까지 가면 마지막 select 가 'ALL PASSED' 를 돌려준다.
--
-- 등장인물: A(글쓴이), B·C·D(이웃)

begin;

-- ── 준비 (postgres 권한) ────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.local');

insert into public.dongs (code, name, full_name, lat, lng, nx, ny) values
  ('1144069000', '망원1동', '서울특별시 마포구 망원1동', 37.5559, 126.9019, 59, 127),
  ('1144070000', '망원2동', '서울특별시 마포구 망원2동', 37.5590, 126.8990, 59, 127);

insert into public.profiles (id, nickname, dong_code) values
  ('00000000-0000-0000-0000-00000000000b', '이웃B', '1144069000'),
  ('00000000-0000-0000-0000-00000000000c', '이웃C', '1144069000'),
  ('00000000-0000-0000-0000-00000000000d', '이웃D', '1144069000');

-- 이후는 로그인한 사용자(authenticated)로 실행
set local role authenticated;

-- ── A: 프로필 생성 ─────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into public.profiles (id, nickname, dong_code)
values ('00000000-0000-0000-0000-00000000000a', '망원산책러', '1144069000');

do $$ begin
  -- R3: 대소문자 무관 중복 / 형식
  begin
    insert into public.profiles (id, nickname, dong_code)
    values ('00000000-0000-0000-0000-00000000000a', '이웃b', '1144069000');
    raise exception 'FAIL: duplicate nickname accepted';
  exception when unique_violation then null; end;

  -- 남의 프로필 원본은 안 보이고, public_profiles 로는 보인다
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: profiles should expose own row only';
  end if;
  if (select count(*) from public.public_profiles) <> 4 then
    raise exception 'FAIL: public_profiles should expose all rows';
  end if;
end $$;

-- ── R4: 닉네임 변경 30일 1회 ────────────────────
update public.profiles set nickname = '망원러너' where id = '00000000-0000-0000-0000-00000000000a';

do $$ begin
  if (select nickname_changed_at from public.profiles) is null then
    raise exception 'FAIL: nickname_changed_at not set';
  end if;
  begin
    update public.profiles set nickname = '또바꿈' where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: second nickname change accepted';
  exception when sqlstate 'WW409' then null; end;
  -- 동네 변경은 자유
  update public.profiles set dong_code = '1144069000' where id = '00000000-0000-0000-0000-00000000000a';
end $$;

-- ── R6/R7: 체감 투표 ───────────────────────────
select public.submit_reaction('cold', array['rain', 'wind', 'rain']);
select public.submit_reaction('good', array['clear']);

do $$
declare s record;
begin
  if (select count(*) from public.reactions where user_id = auth.uid()) <> 1 then
    raise exception 'FAIL: second vote within 1h should update, not insert';
  end if;
  select * into s from public.reaction_summary('1144069000');
  if s.total <> 1 or s.good <> 1 or s.cold <> 0 or s.clear <> 1 or s.rain <> 0 then
    raise exception 'FAIL: summary %', s;
  end if;
  -- R5: 다른 동네에 직접 insert 불가
  begin
    insert into public.reactions (user_id, dong_code, feel)
    values (auth.uid(), '1144070000', 'hot');
    raise exception 'FAIL: vote for other dong accepted';
  exception when insufficient_privilege then null; end;
end $$;

-- ── R8/R9: 한마디 작성 ─────────────────────────
insert into public.posts (user_id, dong_code, content, tag, like_count, is_hidden)
values (auth.uid(), '1144069000', '시장 앞 지금 비 와요', 'rain', 999, true);

do $$ begin
  if (select like_count from public.posts) <> 0 or (select is_hidden from public.posts) then
    raise exception 'FAIL: like_count / is_hidden must be server-managed';
  end if;
  begin
    insert into public.posts (user_id, dong_code, content)
    values (auth.uid(), '1144069000', '1분 안에 또 쓰기');
    raise exception 'FAIL: second post within 1 minute accepted';
  exception when sqlstate 'WW429' then null; end;
  begin
    insert into public.posts (user_id, dong_code, content)
    values (auth.uid(), '1144069000', ' 앞 공백 ');
    raise exception 'FAIL: untrimmed content accepted';
  exception when check_violation or sqlstate 'WW429' then null; end;
end $$;

-- ── R11: 공감 토글 (B) ─────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

insert into public.post_likes (post_id, user_id)
select id, auth.uid() from public.posts;

do $$ begin
  if (select like_count from public.posts) <> 1 then
    raise exception 'FAIL: like_count should be 1';
  end if;
  if not (select liked_by_me from public.post_feed) or (select is_mine from public.post_feed) then
    raise exception 'FAIL: post_feed liked_by_me / is_mine';
  end if;
  if (select nickname from public.post_feed) <> '망원러너' then
    raise exception 'FAIL: post_feed nickname';
  end if;
end $$;

delete from public.post_likes where user_id = auth.uid();
insert into public.post_likes (post_id, user_id) select id, auth.uid() from public.posts;

-- ── R12: 신고 (B, C, D) → 3건이면 숨김 ──────────
insert into public.reports (post_id, user_id, reason)
select id, auth.uid(), 'ad' from public.posts;

do $$ begin
  begin
    insert into public.reports (post_id, user_id, reason)
    select id, auth.uid(), 'etc' from public.posts;
    raise exception 'FAIL: duplicate report accepted';
  exception when unique_violation then null; end;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
insert into public.reports (post_id, user_id, reason) select id, auth.uid(), 'abuse' from public.posts;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
insert into public.reports (post_id, user_id, reason) select id, auth.uid(), 'off_topic' from public.posts;

do $$ begin
  if (select count(*) from public.posts) <> 0 then
    raise exception 'FAIL: hidden post still visible to others';
  end if;
end $$;

-- 글쓴이 A 에게는 숨김 글도 보인다
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$ begin
  if (select count(*) from public.posts where is_hidden and report_count = 3 and like_count = 1) <> 1 then
    raise exception 'FAIL: author should see own hidden post (report_count 3, like_count 1)';
  end if;
  -- 본인 글 신고 불가
  begin
    insert into public.reports (post_id, user_id, reason) select id, auth.uid(), 'etc' from public.posts;
    raise exception 'FAIL: self report accepted';
  exception when insufficient_privilege then null; end;
  -- weather_cache 는 사용자에게 막혀 있다
  begin
    perform 1 from public.weather_cache;
    raise exception 'FAIL: weather_cache readable by authenticated';
  exception when insufficient_privilege then null; end;
end $$;

-- ── 탈퇴: auth 유저 삭제 → 전부 cascade ─────────
reset role;
delete from auth.users where id in (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000b'
);

do $$ begin
  if exists (select 1 from public.posts)
     or exists (select 1 from public.reactions)
     or exists (select 1 from public.post_likes)
     or (select count(*) from public.profiles) <> 2 then
    raise exception 'FAIL: account deletion should cascade';
  end if;
end $$;

select 'ALL PASSED' as result;

rollback;
