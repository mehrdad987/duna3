-- Run in Supabase SQL editor

-- 0) Extensions (optional)
create extension if not exists "uuid-ossp";

-- 1) Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending','completed','failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('earn','spend','bonus','stake');
  end if;
end$$;

-- 2) Tables

-- users
create table if not exists public.users (
  id bigint generated always as identity primary key,
  telegram_id bigint not null unique,
  username text,
  first_name text not null default '',
  last_name text default '',
  ref_code text unique,
  login_date timestamptz not null,
  duna_coins numeric(18,4) not null default 0,
  ton_balance numeric(18,8) not null default 0,
  welcome_bonus_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- lottery_tickets
create table if not exists public.lottery_tickets (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  ticket_code text not null unique,
  month text not null,
  year integer not null,
  is_winner boolean not null default false,
  created_at timestamptz not null default now()
);

-- coin_transactions
create table if not exists public.coin_transactions (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  amount numeric(18,8) not null,
  type transaction_type not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- ton_payments
create table if not exists public.ton_payments (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  ton_amount numeric(18,8) not null default 0,
  duna_amount numeric(18,4) not null default 0,
  transaction_id text,
  withdrawal_address text,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Unique transaction_id when provided
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public' and indexname = 'ton_payments_transaction_id_partial_idx'
  ) then
    create unique index ton_payments_transaction_id_partial_idx
      on public.ton_payments((lower(transaction_id)))
      where transaction_id is not null;
  end if;
end$$;

-- referrals
create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  inviter_user_id bigint not null references public.users(id) on delete cascade,
  invitee_user_id bigint not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(inviter_user_id, invitee_user_id),
  unique(invitee_user_id) -- ensure only one referral per invitee
);

-- winners
create table if not exists public.winners (
  id bigint generated always as identity primary key,
  ticket_code text not null,
  prize text not null,
  month text not null,
  year integer not null,
  user_id bigint references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_users_telegram_id on public.users(telegram_id);
create index if not exists idx_users_ref_code on public.users((upper(ref_code)));
create index if not exists idx_lottery_tickets_user_id on public.lottery_tickets(user_id);
create index if not exists idx_lottery_tickets_month_year on public.lottery_tickets(month, year);
create index if not exists idx_coin_tx_user on public.coin_transactions(user_id);
create index if not exists idx_coin_tx_type on public.coin_transactions(type);
create index if not exists idx_ton_payments_user on public.ton_payments(user_id);
create index if not exists idx_ton_payments_status on public.ton_payments(status);
create index if not exists idx_ton_payments_created on public.ton_payments(created_at);
create index if not exists idx_referrals_inviter on public.referrals(inviter_user_id);
create index if not exists idx_referrals_invitee on public.referrals(invitee_user_id);

-- 3) Triggers to maintain updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_users_updated_at'
  ) then
    create trigger set_users_updated_at
    before update on public.users
    for each row
    execute procedure public.set_updated_at();
  end if;
end$$;

-- 4) Admin helper functions used by admin_approve_payments.sql

-- Returns pending payments with user info (matches your admin file usage)
create or replace function public.get_pending_payments()
returns table (
  payment_id bigint,
  user_id bigint,
  telegram_id bigint,
  username text,
  ton_amount numeric,
  duna_amount numeric,
  transaction_id text,
  withdrawal_address text,
  status payment_status,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    tp.id as payment_id,
    tp.user_id,
    u.telegram_id,
    u.username,
    tp.ton_amount,
    tp.duna_amount,
    tp.transaction_id,
    tp.withdrawal_address,
    tp.status,
    tp.created_at
  from public.ton_payments tp
  join public.users u on u.id = tp.user_id
  where tp.status = 'pending'
  order by tp.created_at asc;
$$;

-- Approve a pending TON payment, crediting user's balances atomically
-- Returns true on success, false if not found or not pending
create or replace function public.approve_ton_payment(p_payment_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id bigint;
  v_ton_amount numeric(18,8);
  v_duna_amount numeric(18,4);
  v_status payment_status;
begin
  -- Lock the row to avoid races
  select user_id, ton_amount, duna_amount, status
    into v_user_id, v_ton_amount, v_duna_amount, v_status
  from public.ton_payments
  where id = p_payment_id
  for update;

  if not found then
    return false;
  end if;

  if v_status <> 'pending' then
    return false;
  end if;

  -- Update payment status
  update public.ton_payments
  set status = 'completed'
  where id = p_payment_id;

  -- Credit user balances
  update public.users
  set
    duna_coins = coalesce(duna_coins, 0) + coalesce(v_duna_amount, 0),
    ton_balance = coalesce(ton_balance, 0) + greatest(coalesce(v_ton_amount, 0), 0)
  where id = v_user_id;

  -- Optional: record coin transaction about this approval
  insert into public.coin_transactions(user_id, amount, type, description)
  values (
    v_user_id,
    coalesce(v_duna_amount, 0),
    'earn',
    concat('TON payment approved: ', coalesce(v_ton_amount, 0), ' TON -> ', coalesce(v_duna_amount, 0), ' Duna')
  );

  return true;
exception
  when others then
    -- Let the transaction rollback on errors
    raise;
end;
$$;

-- 5) Row Level Security (RLS) policies
-- NOTE: For development or if you don't use Auth, you can either disable RLS,
-- or keep permissive policies below. Adjust for production as needed.

-- Option A: Disable RLS for quick start (uncomment to use)
-- alter table public.users disable row level security;
-- alter table public.lottery_tickets disable row level security;
-- alter table public.coin_transactions disable row level security;
-- alter table public.ton_payments disable row level security;
-- alter table public.referrals disable row level security;
-- alter table public.winners disable row level security;

-- Option B: Enable RLS with permissive policies
alter table public.users enable row level security;
alter table public.lottery_tickets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.ton_payments enable row level security;
alter table public.referrals enable row level security;
alter table public.winners enable row level security;

-- Users: allow read for all, write for all (demo-friendly; tighten in prod)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_select_all') then
    create policy users_select_all on public.users for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_insert_all') then
    create policy users_insert_all on public.users for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_update_all') then
    create policy users_update_all on public.users for update using (true) with check (true);
  end if;
end$$;

-- Lottery tickets: read all; create by anyone
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lottery_tickets' and policyname='lottery_tickets_select_all') then
    create policy lottery_tickets_select_all on public.lottery_tickets for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lottery_tickets' and policyname='lottery_tickets_insert_all') then
    create policy lottery_tickets_insert_all on public.lottery_tickets for insert with check (true);
  end if;
end$$;

-- Coin transactions: read all; insert by anyone
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coin_transactions' and policyname='coin_tx_select_all') then
    create policy coin_tx_select_all on public.coin_transactions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coin_transactions' and policyname='coin_tx_insert_all') then
    create policy coin_tx_insert_all on public.coin_transactions for insert with check (true);
  end if;
end$$;

-- TON payments: read all; insert by anyone; updates via admin function
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ton_payments' and policyname='ton_payments_select_all') then
    create policy ton_payments_select_all on public.ton_payments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ton_payments' and policyname='ton_payments_insert_all') then
    create policy ton_payments_insert_all on public.ton_payments for insert with check (true);
  end if;
end$$;

-- Referrals: read all; insert by anyone (uniques enforce one-per-invitee)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrals' and policyname='referrals_select_all') then
    create policy referrals_select_all on public.referrals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrals' and policyname='referrals_insert_all') then
    create policy referrals_insert_all on public.referrals for insert with check (true);
  end if;
end$$;

-- Winners: read all; insert by anyone (tighten in prod)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='winners' and policyname='winners_select_all') then
    create policy winners_select_all on public.winners for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='winners' and policyname='winners_insert_all') then
    create policy winners_insert_all on public.winners for insert with check (true);
  end if;
end$$;

-- 6) Optional: grant execute on admin functions to authenticated users only
-- adjust roles to your setup; using anon here for convenience during development
grant execute on function public.get_pending_payments() to anon, authenticated, service_role;
grant execute on function public.approve_ton_payment(bigint) to service_role;
-- In production, call approve_ton_payment via service key or secure RPC only.