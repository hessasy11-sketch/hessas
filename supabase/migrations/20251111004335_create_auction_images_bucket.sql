/*
  # إنشاء Storage Bucket لصور المزادات

  1. إنشاء Bucket
    - اسم الـ bucket: `auction-images`
    - Public: نعم (للوصول العام للصور)
    
  2. الأمان
    - السماح للجميع بقراءة الصور
    - السماح للمستخدمين المسجلين فقط برفع الصور
    - كل مستخدم يمكنه رفع الصور في مجلده الخاص فقط
*/

-- إنشاء bucket للصور
INSERT INTO storage.buckets (id, name, public)
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO NOTHING;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Public Access for Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- السماح للجميع بقراءة الصور
CREATE POLICY "Public Access for Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'auction-images');

-- السماح للمستخدمين المسجلين برفع الصور في مجلدهم الخاص
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'auction-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- السماح للمستخدمين بحذف صورهم الخاصة
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'auction-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
