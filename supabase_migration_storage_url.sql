-- Add storage_url column to courses table for PDF viewing
-- This stores the Supabase Storage public URL for PDF files

ALTER TABLE courses ADD COLUMN IF NOT EXISTS storage_url TEXT;

-- Update existing courses: Try to construct storage_url from file_uri if possible
-- Note: This is a best-effort migration. Existing courses with Gemini URIs won't have valid storage_url
-- They will need to be re-uploaded to get a valid storage URL

COMMENT ON COLUMN courses.storage_url IS 'Supabase Storage public URL for PDF file viewing. Used for enrolled students who dont have the file locally.';
