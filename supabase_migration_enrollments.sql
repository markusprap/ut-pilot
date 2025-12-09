-- Migration: Enrollment System Phase 5

-- 1. Create table for User-Specific Progress (Enrollments)
CREATE TABLE IF NOT EXISTS course_enrollments (
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at bigint DEFAULT extract(epoch from now()) * 1000,
  last_accessed bigint DEFAULT extract(epoch from now()) * 1000,
  modules jsonb DEFAULT '{}'::jsonb, -- Private notes/quiz pool for the student
  exam_history jsonb DEFAULT '[]'::jsonb, -- Private exam history
  user_personal_notes text, -- Private generic notes
  PRIMARY KEY (course_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Enrollments
CREATE POLICY "Users can select own enrollments" ON course_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments" ON course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments" ON course_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own enrollments" ON course_enrollments
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Update 'courses' Policy to allow Enrolled users to see the course
-- Even if is_public becomes false later, enrolled users usually keep access?
-- Or strictly strictly public? User said "kalo yang punya course hapus, di db masih ada... harusnya ngga gitu".
-- So if DELETED, it cascades.
-- If set to PRIVATE, maybe we restrict?
-- Let's assume: If you are enrolled, you can SEE the course metadata.

DROP POLICY IF EXISTS "Users can see own or public courses" ON courses;

CREATE POLICY "Users can see own, public, or enrolled courses" ON courses
  FOR SELECT USING (
    auth.uid() = user_id -- Owner
    OR is_public = true -- Public
    OR EXISTS (SELECT 1 FROM course_enrollments WHERE course_id = courses.id AND user_id = auth.uid()) -- Enrolled
  );

-- Note: No Update/Delete policy change needed for courses (Restricted to owner only).
