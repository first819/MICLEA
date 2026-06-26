-- Remember the Stripe customer so subscription cancellations can revert the tier.
alter table public.user_tier add column if not exists stripe_customer_id text;
create index if not exists user_tier_stripe_customer_idx on public.user_tier(stripe_customer_id);
