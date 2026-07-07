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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert feedback' AND tablename = 'feedback') THEN
    create policy "Users can insert feedback"
      on feedback for insert with check (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can view all feedback' AND tablename = 'feedback') THEN
    create policy "Admin can view all feedback"
      on feedback for select using (true);
  END IF;
END $$;
