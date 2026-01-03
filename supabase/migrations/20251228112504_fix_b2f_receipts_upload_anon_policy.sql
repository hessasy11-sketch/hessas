/*
  # إصلاح سياسات رفع الإيصالات للمستثمرين (anon role)

  1. المشكلة
    - سياسة INSERT الحالية لـ anon لا تعمل بشكل صحيح
    - الخطأ: "new row violates row-level security policy" مع status 403
    - المسار المستخدم: b2f-payments/filename.pdf

  2. الحل
    - حذف السياسات القديمة
    - إنشاء سياسة جديدة أبسط وأكثر تساهلاً
    - استخدام pattern matching بدلاً من foldername function
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "B2F investors can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "B2F investors can update payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "B2F investors can view payment receipts" ON storage.objects;

-- سياسة INSERT - رفع الإيصالات (anon + authenticated)
CREATE POLICY "Allow anon to upload B2F payment receipts"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'receipts' 
  AND name LIKE 'b2f-payments/%'
);

-- سياسة SELECT - قراءة الإيصالات (public)
CREATE POLICY "Allow public to view B2F payment receipts"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'receipts' 
  AND name LIKE 'b2f-payments/%'
);

-- سياسة UPDATE - تحديث الإيصالات (anon + authenticated)
CREATE POLICY "Allow anon to update B2F payment receipts"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'receipts' 
  AND name LIKE 'b2f-payments/%'
)
WITH CHECK (
  bucket_id = 'receipts' 
  AND name LIKE 'b2f-payments/%'
);

-- سياسة DELETE - حذف الإيصالات (authenticated فقط)
CREATE POLICY "Allow authenticated to delete B2F payment receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND name LIKE 'b2f-payments/%'
);
