-- Draftee — run in Supabase SQL Editor

create table if not exists drafts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  draft_type text not null,
  party1_name text,
  party1_address text,
  party2_name text,
  party2_address text,
  situation text not null,
  amount text,
  generated_draft text not null,
  created_at timestamp with time zone default now()
);

alter table drafts enable row level security;

drop policy if exists "Users can only see their own drafts" on drafts;
create policy "Users can only see their own drafts"
  on drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  advocate_name text,
  bar_council_number text,
  court_jurisdiction text,
  referral_code text unique not null,
  referred_by uuid references auth.users(id),
  theme text default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users manage own profile" on profiles;
create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read referral codes" on profiles;
create policy "Anyone can read referral codes"
  on profiles for select
  using (true);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text default 'free' check (plan in ('free', 'pro')),
  pro_until timestamptz,
  drafts_this_month int default 0,
  month_key text default to_char(now(), 'YYYY-MM'),
  referral_rewards_granted int default 0,
  chat_messages_today int default 0,
  chat_day_key text default to_char(now(), 'YYYY-MM-DD'),
  updated_at timestamptz default now()
);

-- If subscriptions table already exists, run:
-- alter table subscriptions add column if not exists chat_messages_today int default 0;
-- alter table subscriptions add column if not exists chat_day_key text default to_char(now(), 'YYYY-MM-DD');

alter table subscriptions enable row level security;

drop policy if exists "Users manage own subscription" on subscriptions;
create policy "Users manage own subscription"
  on subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid unique references auth.users(id) on delete cascade,
  status text default 'completed' check (status in ('pending', 'completed')),
  created_at timestamptz default now()
);

alter table referrals enable row level security;

drop policy if exists "Users see own referrals" on referrals;
create policy "Users see own referrals"
  on referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

drop policy if exists "Users insert referrals as referred" on referrals;
create policy "Users insert referrals as referred"
  on referrals for insert
  with check (auth.uid() = referred_user_id);

create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount_paise int not null,
  status text default 'created',
  created_at timestamptz default now()
);

alter table payments enable row level security;

drop policy if exists "Users see own payments" on payments;
create policy "Users see own payments"
  on payments for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own payments" on payments;
create policy "Users insert own payments"
  on payments for insert
  with check (auth.uid() = user_id);

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  code text;
  taken boolean;
begin
  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    select exists(select 1 from public.profiles where referral_code = code) into taken;
    exit when not taken;
  end loop;
  return code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    public.generate_referral_code()
  )
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan, drafts_this_month, month_key)
  values (new.id, 'free', 0, to_char(now(), 'YYYY-MM'))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.grant_referral_rewards(p_referrer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_granted int;
  v_new int;
  v_pro_until timestamptz;
begin
  select count(*)::int into v_count
  from referrals
  where referrer_id = p_referrer_id and status = 'completed';

  v_new := (v_count / 5) * 2;

  select coalesce(referral_rewards_granted, 0) into v_granted
  from subscriptions
  where user_id = p_referrer_id;

  if v_new > v_granted then
    select pro_until into v_pro_until from subscriptions where user_id = p_referrer_id;
    if v_pro_until is null or v_pro_until < now() then
      v_pro_until := now();
    end if;
    v_pro_until := v_pro_until + (v_new - v_granted) * interval '1 month';

    update subscriptions
    set plan = 'pro',
        pro_until = v_pro_until,
        referral_rewards_granted = v_new,
        updated_at = now()
    where user_id = p_referrer_id;
  end if;
end;
$$;
