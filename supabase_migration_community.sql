-- Migration for Community Features (Phase 4)

-- 1. Add Community Columns
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS original_author_id uuid REFERENCES auth.users(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS author_name text;

-- 2. Update RLS Policy for SELECT
-- Drop the restrictive "own courses only" policy
DROP POLICY IF EXISTS "Users can see own courses" ON courses;

-- Create a new inclusive policy (Own OR Public)
CREATE POLICY "Users can see own or public courses" ON courses
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- Note: INSERT, UPDATE, DELETE policies usually restrict by `user_id = auth.uid()`, so they remain safe (Public users can't edit/delete others' courses).
