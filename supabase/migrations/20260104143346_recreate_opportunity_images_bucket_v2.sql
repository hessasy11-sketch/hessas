/*
  # إعادة إنشاء bucket صور العروض الاستثمارية
  
  1. Storage Bucket
    - إنشاء bucket باسم 'opportunity-images' باستخدام دالة آمنة
    - البكت عام (public) لعرض الصور
    - حد أقصى 5 ميجابايت لكل صورة
    
  2. RLS Policies
    - السماح للجميع بقراءة الصور
    - السماح لأي مستخدم برفع/حذف/تحديث الصور
*/

-- دالة لإنشاء البكت بصلاحيات آمنة
CREATE OR REPLACE FUNCTION create_opportunity_images_bucket()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إنشاء البكت إذا لم يكن موجودًا
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'opportunity-images',
    'opportunity-images',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
END;
$$;

-- تنفيذ الدالة لإنشاء البكت
SELECT create_opportunity_images_bucket();

-- حذف الدالة بعد الاستخدام
DROP FUNCTION IF EXISTS create_opportunity_images_bucket();

-- RLS Policies للصور في Storage

-- 1. السماح للجميع بقراءة الصور
DROP POLICY IF EXISTS "Allow public read access to opportunity images" ON storage.objects;
CREATE POLICY "Allow public read access to opportunity images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'opportunity-images');

-- 2. السماح لأي مستخدم برفع الصور
DROP POLICY IF EXISTS "Allow all users to upload opportunity images" ON storage.objects;
CREATE POLICY "Allow all users to upload opportunity images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'opportunity-images');

-- 3. السماح لأي مستخدم بحذف الصور
DROP POLICY IF EXISTS "Allow all users to delete opportunity images" ON storage.objects;
CREATE POLICY "Allow all users to delete opportunity images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'opportunity-images');

-- 4. السماح لأي مستخدم بتحديث الصور
DROP POLICY IF EXISTS "Allow all users to update opportunity images" ON storage.objects;
CREATE POLICY "Allow all users to update opportunity images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'opportunity-images')
WITH CHECK (bucket_id = 'opportunity-images');