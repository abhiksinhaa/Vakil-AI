-- Add missing columns to feedback table or create it if it doesn't exist
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text,
  draft_type text,
  created_at timestamp with time zone default now(),
  user_email text,
  advocate_name text,
  feedback_type text,
  subject text,
  description text
);

-- If the table existed but without comment and draft_type, the above create table won't add them.
-- So we add columns using alter table (will succeed if columns are new, fail gracefully if they exist using a DO block)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedback' AND column_name='comment') THEN
    ALTER TABLE feedback ADD COLUMN comment text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedback' AND column_name='draft_type') THEN
    ALTER TABLE feedback ADD COLUMN draft_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedback' AND column_name='rating') THEN
    ALTER TABLE feedback ADD COLUMN rating integer check (rating between 1 and 5);
  END IF;
END $$;

alter table feedback enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='daily_draft_count') THEN
    ALTER TABLE profiles ADD COLUMN daily_draft_count integer default 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_draft_date') THEN
    ALTER TABLE profiles ADD COLUMN last_draft_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert feedback' AND tablename = 'feedback') THEN
    create policy "Users can insert feedback"
      on feedback for insert with check (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can view all feedback' AND tablename = 'feedback') THEN
    create policy "Admin can view all feedback"
      on feedback for select using (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan') THEN
    ALTER TABLE profiles ADD COLUMN plan text default 'free';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='drafts_limit') THEN
    ALTER TABLE profiles ADD COLUMN drafts_limit integer default 5;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='drafts_used') THEN
    ALTER TABLE profiles ADD COLUMN drafts_used integer default 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_expires_at') THEN
    ALTER TABLE profiles ADD COLUMN plan_expires_at timestamp with time zone;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='razorpay_payment_id') THEN
    ALTER TABLE profiles ADD COLUMN razorpay_payment_id text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS draft_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  draft_id uuid unique,
  created_at timestamp with time zone default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'draft_usage_draft_id_key'
  ) THEN
    ALTER TABLE draft_usage ADD CONSTRAINT draft_usage_draft_id_key UNIQUE (draft_id);
  END IF;
END $$;

alter table draft_usage enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own draft usage' AND tablename = 'draft_usage') THEN
    create policy "Users can insert own draft usage"
      on draft_usage for insert with check (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own draft usage' AND tablename = 'draft_usage') THEN
    create policy "Users can view own draft usage"
      on draft_usage for select using (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  amount_paise integer not null default 0,
  status text not null default 'paid',
  type text,
  plan text,
  created_at timestamp with time zone default now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='type') THEN
    ALTER TABLE payments ADD COLUMN type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='plan') THEN
    ALTER TABLE payments ADD COLUMN plan text;
  END IF;
END $$;
