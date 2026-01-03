/*
  # إعادة إنشاء bucket إيصالات الدفع B2F

  1. المشكلة:
    - Bucket 'b2f-payment-receipts' غير موجود
    - خطأ: "Bucket not found" عند رفع الإيصالات

  2. الحل:
    - حذف الـ bucket القديم إن وجد
    - إنشاء bucket جديد
    - إضافة جميع السياسات المطلوبة
*/

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "المستثمرون يمكنهم رفع إيصالاتهم" ON storage.objects;
DROP POLICY IF EXISTS "الجميع يمكنهم عرض الإيصالات" ON storage.objects;
DROP POLICY IF EXISTS "الإدارة يمكنها إدارة الإيصالات" ON storage.objects;
DROP POLICY IF EXISTS "anon_upload_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "admin_manage_payment_receipts" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_payment_receipt" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_payment_receipts" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_payment_receipts" ON storage.objects;

-- حذف الـ bucket القديم إن وجد
DELETE FROM storage.buckets WHERE id = 'b2f-payment-receipts';

-- إنشاء bucket جديد
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'b2f-payment-receipts',
  'b2f-payment-receipts',
  true,
  10485760,  -- 10MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
);

-- سياسة 1: السماح للجميع برفع الإيصالات (anon)
CREATE POLICY "anon_upload_payment_receipt"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 2: السماح للجميع بقراءة الإيصالات (public bucket)
CREATE POLICY "anon_read_payment_receipt"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 3: السماح للمستخدمين المسجلين برفع الإيصالات
CREATE POLICY "authenticated_upload_payment_receipt"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 4: السماح للمستخدمين المسجلين بقراءة الإيصالات
CREATE POLICY "authenticated_read_payment_receipt"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 5: الإدارة يمكنها حذف الإيصالات
CREATE POLICY "admin_delete_payment_receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'b2f-payment-receipts'
);

-- سياسة 6: الإدارة يمكنها تحديث الإيصالات
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
