// TODO: Run in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  case_type text,
  description text,
  status text DEFAULT 'active',
  -- status: 'active', 'closed', 'archived'
  next_hearing_date date,
  court_name text,
  case_number text,
  opposite_party text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  matter_id uuid REFERENCES matters(id),
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'pending',
  -- status: 'pending', 'completed'
  priority text DEFAULT 'normal',
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  matter_id uuid REFERENCES matters(id) NOT NULL,
  hearing_date date NOT NULL,
  hearing_time time,
  court_name text,
  notes text,
  status text DEFAULT 'upcoming',
  created_at timestamptz DEFAULT NOW()
);

ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own matters"
ON matters FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own tasks"
ON tasks FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own hearings"
ON hearings FOR ALL USING (user_id = auth.uid());

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS 
  matter_id uuid REFERENCES matters(id);

-- The "documents" bucket already exists. Keep it private; do not create another bucket.
-- TODO: Run these policies in the Supabase SQL Editor:
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
