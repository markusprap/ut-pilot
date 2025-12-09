
-- 1. Create Courses Table
create table courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  code text not null,
  file_uri text not null,
  mime_type text not null,
  file_name text,
  created_at bigint default extract(epoch from now()) * 1000,
  last_accessed bigint default extract(epoch from now()) * 1000,
  modules jsonb default '{}'::jsonb,
  exam_history jsonb default '[]'::jsonb,
  user_personal_notes text
);

-- 2. Enable Row Level Security (RLS)
alter table courses enable row level security;

-- 3. Create Policy: Users can only see their own courses
create policy "Users can see own courses" on courses
  for select using (auth.uid() = user_id);

-- 4. Create Policy: Users can insert their own courses
create policy "Users can insert own courses" on courses
  for insert with check (auth.uid() = user_id);

-- 5. Create Policy: Users can update their own courses
create policy "Users can update own courses" on courses
  for update using (auth.uid() = user_id);

-- 6. Create Policy: Users can delete their own courses
create policy "Users can delete own courses" on courses
  for delete using (auth.uid() = user_id);
