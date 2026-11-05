-- Supabase Dashboard > SQL Editor 에서 전체를 실행하세요.
-- 새 테이블 생성과 RLS 정책을 하나의 트랜잭션으로 적용합니다.
begin;

create table if not exists public.prayer_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  title text not null check (char_length(title) between 1 and 100),
  prayer text not null default '' check (char_length(prayer) <= 10000),
  gratitude text not null default '' check (char_length(gratitude) <= 10000),
  created_at timestamptz not null default now(),
  constraint entry_has_content check (char_length(trim(prayer)) + char_length(trim(gratitude)) > 0)
);
create index if not exists prayer_entries_owner_date_idx
  on public.prayer_entries(user_id, entry_date desc, created_at desc);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  verse_id text not null check (verse_id in ('sadness','anxiety','loneliness','hurt','hope','gratitude')),
  created_at timestamptz not null default now(),
  unique (user_id, verse_id)
);

alter table public.prayer_entries enable row level security;
alter table public.prayer_entries force row level security;
alter table public.favorites enable row level security;
alter table public.favorites force row level security;

-- 재실행할 수 있도록 이 앱의 정책만 교체합니다.
drop policy if exists entries_select_own on public.prayer_entries;
drop policy if exists entries_insert_own on public.prayer_entries;
drop policy if exists entries_delete_own on public.prayer_entries;
create policy entries_select_own on public.prayer_entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy entries_insert_own on public.prayer_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy entries_delete_own on public.prayer_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists favorites_select_own on public.favorites;
drop policy if exists favorites_insert_own on public.favorites;
drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_select_own on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);
create policy favorites_insert_own on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy favorites_delete_own on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 익명 읽기/쓰기와 수정 권한은 제공하지 않습니다.
revoke all on public.prayer_entries, public.favorites from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on public.prayer_entries, public.favorites to authenticated;
commit;
