/*
  # نظام رفع الصور للعروض الاستثمارية B2F

  1. Storage Bucket
    - إنشاء bucket باسم 'opportunity-images'
    - السماح برفع صور JPG, JPEG, PNG, WEBP
    - حد أقصى 5 ميجابايت لكل صورة
    - المستخدمين المسجلين يمكنهم رفع الصور
    - الجميع يمكنهم قراءة الصور

  2. تحديث جدول b2f_opportunities
    - حقل images موجود بالفعل (jsonb)
    - سيحتوي على مصفوفة من مسارات الصور (حتى 3 صور)
    - الصورة الأولى = الصورة الرئيسية

  3. Security
    - RLS policies للتحكم في الرفع والعرض
*/

-- إنشاء Storage Bucket للصور
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

-- RLS Policies للصور في Storage

-- السماح للجميع بقراءة الصور
DROP POLICY IF EXISTS "Allow public read access to opportunity images" ON storage.objects;
CREATE POLICY "Allow public read access to opportunity images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'opportunity-images');

-- السماح للمستخدمين المسجلين برفع الصور
DROP POLICY IF EXISTS "Allow authenticated to upload opportunity images" ON storage.objects;
CREATE POLICY "Allow authenticated to upload opportunity images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'opportunity-images');

-- السماح للمستخدمين المسجلين بحذف الصور
DROP POLICY IF EXISTS "Allow authenticated to delete opportunity images" ON storage.objects;
CREATE POLICY "Allow authenticated to delete opportunity images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'opportunity-images');

-- السماح للمستخدمين المسجلين بتحديث الصور
DROP POLICY IF EXISTS "Allow authenticated to update opportunity images" ON storage.objects;
CREATE POLICY "Allow authenticated to update opportunity images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'opportunity-images');

-- إضافة تعليق على حقل images
COMMENT ON COLUMN b2f_opportunities.images IS 'مصفوفة JSON تحتوي على مسارات الصور (حتى 3 صور) - الصورة الأولى هي الرئيسية';
