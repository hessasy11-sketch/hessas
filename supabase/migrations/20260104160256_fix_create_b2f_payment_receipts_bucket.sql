/*
  # إنشاء bucket إيصالات الدفع B2F

  1. المشكلة:
    - Bucket 'b2f-payment-receipts' غير موجود
    - خطأ: "Bucket not found" عند رفع الإيصالات

  2. الحل:
    - إنشاء bucket جديد بالمواصفات المطلوبة
    - إضافة سياسات RLS للسماح برفع وقراءة الإيصالات
*/

-- حذف الـ bucket القديم إن وجد
DELETE FROM storage.buckets WHERE id = 'b2f-payment-receipts';

-- إنشاء bucket جديد
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'b2f-payment-receipts',
  'b2f-payment-receipts',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "anon_upload_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_payment_receipts" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_payment_receipts" ON storage.objects;

-- سياسة 1: السماح للجميع برفع الإيصالات
CREATE POLICY "anon_upload_payment_receipt"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 2: السماح للجميع بقراءة الإيصالات
CREATE POLICY "anon_read_payment_receipt"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 3: المستخدمين المسجلين - رفع
CREATE POLICY "authenticated_upload_payment_receipt"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 4: المستخدمين المسجلين - قراءة
CREATE POLICY "authenticated_read_payment_receipt"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 5: الإدارة - حذف
CREATE POLICY "admin_delete_payment_receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 6: الإدارة - تحديث
CREATE POLICY "admin_update_payment_receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'b2f-payment-receipts'
)
WITH CHECK (
  bucket_id = 'b2f-payment-receipts'
);