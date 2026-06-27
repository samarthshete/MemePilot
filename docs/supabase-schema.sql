-- ChadWallet Web — Supabase schema (run once in the Supabase SQL editor).
-- Phase C-2: account/portfolio persistence (ADR-026).
--
-- ACCESS MODEL: RLS is ENABLED with NO public policies, so the anon/auth keys
-- cannot read or write these tables. ALL access goes through our server API
-- routes using the SERVICE-ROLE key (which bypasses RLS) AFTER verifying the
-- Privy access token. There is no client-side Supabase access.

-- ---------------------------------------------------------------- users -------
create table if not exists public.users (
  privy_did      text primary key,
  wallet_address text,
  display_name   text,
  email          text,
  created_at     timestamptz not null default now()
);

-- --------------------------------------------------------------- trades -------
create table if not exists public.trades (
  id              uuid primary key default gen_random_uuid(),
  privy_did       text not null,
  token_address   text not null,
  symbol          text,
  side            text not null check (side in ('buy', 'sell')),
  amount_usd      numeric,
  token_qty       numeric,
  price_at_trade  numeric,
  tx_signature    text,
  status          text,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists trades_privy_did_created_idx
  on public.trades (privy_did, created_at desc);

-- ------------------------------------------------------------------ RLS -------
-- Enable RLS and add NO permissive policies → the anon/authenticated keys get
-- zero access. The server uses the service-role key, which bypasses RLS entirely.
alter table public.users  enable row level security;
alter table public.trades enable row level security;

-- (Intentionally no CREATE POLICY statements: default-deny for non-service keys.)
