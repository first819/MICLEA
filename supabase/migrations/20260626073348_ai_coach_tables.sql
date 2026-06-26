-- Résumés: structured editor fields + uploaded file pointer + extracted text
create table if not exists public.resumes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  fields     jsonb       not null default '{}'::jsonb,
  file_path  text,
  file_text  text,
  updated_at timestamptz not null default now()
);

-- Question bank: user_id NULL = curated/global, world-readable
create table if not exists public.question_bank (
  id              bigint generated always as identity primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  content         text   not null,
  role            text,
  topic           text,
  difficulty      text   check (difficulty in ('easy','medium','hard')),
  source          text   not null default 'ai' check (source in ('curated','ai')),
  times_practiced int    not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists question_bank_user_idx on public.question_bank(user_id);

create table if not exists public.practice_sessions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  mode         text not null check (mode in ('speed','gauntlet')),
  score        numeric,
  completed_at timestamptz not null default now()
);
create index if not exists practice_sessions_user_idx on public.practice_sessions(user_id);

create table if not exists public.session_answers (
  id          bigint generated always as identity primary key,
  session_id  bigint not null references public.practice_sessions(id) on delete cascade,
  question_id bigint references public.question_bank(id) on delete set null,
  answer_text text,
  feedback    text,
  score       numeric,
  created_at  timestamptz not null default now()
);
create index if not exists session_answers_session_idx on public.session_answers(session_id);

create table if not exists public.cover_letters (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  job_title  text,
  company    text,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists cover_letters_user_idx on public.cover_letters(user_id);

create table if not exists public.company_packs (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  company       text not null,
  industry      text,
  research_json jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists company_packs_user_idx on public.company_packs(user_id);

-- Server-side tier source of truth (localStorage stays a UX mirror)
create table if not exists public.user_tier (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  tier       text not null default 'free' check (tier in ('free','pro','ultra')),
  updated_at timestamptz not null default now()
);

-- Enable RLS on everything
alter table public.resumes           enable row level security;
alter table public.question_bank     enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.session_answers   enable row level security;
alter table public.cover_letters     enable row level security;
alter table public.company_packs     enable row level security;
alter table public.user_tier         enable row level security;

-- Owner-only policies (auth.uid() = the row's user)
create policy "own resumes"   on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sessions"  on public.practice_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own answers"   on public.session_answers
  for all using (
    exists (select 1 from public.practice_sessions s
            where s.id = session_answers.session_id and s.user_id = auth.uid())
  );

create policy "own letters"   on public.cover_letters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own packs"     on public.company_packs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own tier read" on public.user_tier
  for select using (auth.uid() = user_id);

-- Question bank: read your own OR curated; write only your own
create policy "read own or curated" on public.question_bank
  for select using (user_id is null or auth.uid() = user_id);
create policy "insert own"          on public.question_bank
  for insert with check (auth.uid() = user_id);
create policy "update own"          on public.question_bank
  for update using (auth.uid() = user_id);
