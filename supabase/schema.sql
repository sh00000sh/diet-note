-- 식단 노트 DB
-- Supabase 대시보드 → SQL Editor → New query 에 전부 붙여넣고 Run 한 번만 누르면 돼요.
-- 여러 번 실행해도 괜찮아요.

-- 1) 기록: 사람마다 프로필 1개 + 날짜별 1개 (식단·물·운동이 한 문서에)
create table if not exists public.docs (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,                -- 'profile' 또는 '2026-10-30' 같은 날짜
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.docs enable row level security;
drop policy if exists "docs: 내 것만 읽기" on public.docs;
drop policy if exists "docs: 내 것만 쓰기" on public.docs;
drop policy if exists "docs: 내 것만 고치기" on public.docs;
drop policy if exists "docs: 내 것만 지우기" on public.docs;
create policy "docs: 내 것만 읽기"   on public.docs for select using (auth.uid() = user_id);
create policy "docs: 내 것만 쓰기"   on public.docs for insert with check (auth.uid() = user_id);
create policy "docs: 내 것만 고치기" on public.docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "docs: 내 것만 지우기" on public.docs for delete using (auth.uid() = user_id);

-- 2) 알림 받을 기기 (폰마다 1줄)
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  prefs      jsonb not null default '{}'::jsonb,   -- {water, meals, workout:{on,time,days}}
  tz         text not null default 'Asia/Seoul',
  last_sent  jsonb not null default '{}'::jsonb,   -- 같은 알림 두 번 안 보내게
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "push: 내 것만" on public.push_subs;
create policy "push: 내 것만" on public.push_subs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) AI 사용량 (하루 한도) — 서버만 씀
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;   -- 정책 없음 = 앱에서는 못 읽고, 서버(service key)만 씀

create or replace function public.bump_ai_usage(p_user uuid, p_day date, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into ai_usage(user_id, day, count) values (p_user, p_day, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
  returning count into c;
  return c <= p_max;
end $$;
revoke all on function public.bump_ai_usage(uuid, date, int) from public, anon, authenticated;
