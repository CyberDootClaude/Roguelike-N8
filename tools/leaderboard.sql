-- Bonk Realms online leaderboards — run this once in the Supabase SQL editor.
-- Anyone can read scores; anyone can insert a score within sane limits; nobody can edit or delete.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  board text not null check (char_length(board) between 3 and 40),
  name text not null check (char_length(name) between 1 and 16),
  score integer not null check (score between 0 and 5000000),
  hero text check (char_length(hero) <= 24),
  stage integer check (stage between 1 and 200),
  kills integer check (kills between 0 and 2000000),
  version text check (char_length(version) <= 12),
  created_at timestamptz not null default now()
);

create index if not exists scores_board_score on public.scores (board, score desc);

alter table public.scores enable row level security;

drop policy if exists "read scores" on public.scores;
create policy "read scores" on public.scores for select using (true);

drop policy if exists "insert scores" on public.scores;
create policy "insert scores" on public.scores for insert with check (
  board ~ '^(daily|week|live)-[A-Za-z0-9-]+$'
);
