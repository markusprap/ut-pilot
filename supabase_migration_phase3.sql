
-- Phase 3: Chat Persistence Tables

-- 1. Create Chat Sessions Table (One session per course or multiple?)
-- Let's assume one main discussion thread per course for now to keep it simple, 
-- or allow multiple threads. Let's go with multiple threads linked to a course.
create table chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  course_id uuid references courses(id) on delete cascade not null,
  title text default 'Diskusi Baru',
  created_at bigint default extract(epoch from now()) * 1000,
  updated_at bigint default extract(epoch from now()) * 1000
);

-- 2. Create Messages Table
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at bigint default extract(epoch from now()) * 1000
);

-- 3. Enable RLS
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- 4. Policies for Sessions
create policy "Users can manage own sessions" on chat_sessions
  for all using (auth.uid() = user_id);

-- 5. Policies for Messages
-- Users can see/insert messages if they own the session
create policy "Users can manage own messages" on chat_messages
  for all using (
    exists (
      select 1 from chat_sessions 
      where id = chat_messages.session_id 
      and user_id = auth.uid()
    )
  );
