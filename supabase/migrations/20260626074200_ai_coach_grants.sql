-- New tables created outside Supabase's default-privilege path don't inherit
-- role grants, so service_role hit "permission denied". Grant explicitly.

-- service_role needs full access (it bypasses RLS but still needs table grants)
grant all privileges on
  public.resumes, public.question_bank, public.practice_sessions,
  public.session_answers, public.cover_letters, public.company_packs, public.user_tier
  to service_role;

-- authenticated (logged-in browser) operates under RLS; needs table-level DML grants
grant select, insert, update, delete on
  public.resumes, public.question_bank, public.practice_sessions,
  public.session_answers, public.cover_letters, public.company_packs, public.user_tier
  to authenticated;

-- anon may read curated questions when not logged in
grant select on public.question_bank to anon;

-- identity (bigint) columns need sequence access for INSERT
grant usage, select on all sequences in schema public to service_role, authenticated;
