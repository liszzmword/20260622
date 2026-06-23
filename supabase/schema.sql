-- Supabase SQL Editor에서 전체 실행하세요.
-- Table: lotto_draws (추첨 번호 저장)

create table if not exists public.lotto_draws (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  batch_id uuid not null default gen_random_uuid(),
  set_index integer not null default 1 check (set_index > 0),
  numbers integer[] not null,
  bonus_number integer not null,
  constraint lotto_draws_numbers_length check (array_length(numbers, 1) = 6),
  constraint lotto_draws_bonus_range check (bonus_number between 1 and 45)
);

create index if not exists lotto_draws_created_at_idx
  on public.lotto_draws (created_at desc);

create index if not exists lotto_draws_batch_id_idx
  on public.lotto_draws (batch_id);

alter table public.lotto_draws enable row level security;

drop policy if exists "Allow public read" on public.lotto_draws;
drop policy if exists "Allow public insert" on public.lotto_draws;
drop policy if exists "Allow public delete" on public.lotto_draws;

create policy "Allow public read"
  on public.lotto_draws for select
  using (true);

create policy "Allow public insert"
  on public.lotto_draws for insert
  with check (true);

create policy "Allow public delete"
  on public.lotto_draws for delete
  using (true);

-- API(anon/service_role) 접근 권한 (저장 실패 시 이 구문 누락 여부 확인)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, delete on table public.lotto_draws to anon, authenticated, service_role;
