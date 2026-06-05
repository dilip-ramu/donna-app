-- Run this once in the Supabase SQL editor for the Donna project
-- 1. Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('council-avatars', 'council-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: authenticated users can read/write only their own folder
CREATE POLICY IF NOT EXISTS "own avatars" ON storage.objects
  FOR ALL TO authenticated
  USING   (bucket_id = 'council-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'council-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Public read for img src
CREATE POLICY IF NOT EXISTS "public avatar read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'council-avatars');
