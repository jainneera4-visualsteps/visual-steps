-- Persistent image storage for authenticated Visual Steps parents.
-- The bucket is public so saved image URLs continue to work in activities,
-- stories, quizzes, and child views. Uploads remain ownership-scoped and use
-- unguessable server-generated object names.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visual-steps-uploads',
  'visual-steps-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Parents can upload their own Visual Steps images" ON storage.objects;
CREATE POLICY "Parents can upload their own Visual Steps images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'visual-steps-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Parents can delete their own Visual Steps images" ON storage.objects;
CREATE POLICY "Parents can delete their own Visual Steps images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'visual-steps-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
