-- Run in Supabase SQL Editor

create table drafts (
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

create policy "Users can only see their own drafts"
  on drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
