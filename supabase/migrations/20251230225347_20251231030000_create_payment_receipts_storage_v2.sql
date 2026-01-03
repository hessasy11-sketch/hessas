/*
  # إنشاء Storage Bucket لمستندات الدفع
  
  ## التغييرات:
  
  1. إنشاء bucket جديد: b2f-payment-receipts
  2. إضافة RLS policies للرفع والقراءة
*/

-- إنشاء bucket إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('b2f-payment-receipts', 'b2f-payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- حذف الـ policies القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Investors can upload payment documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete payment documents" ON storage.objects;

-- سياسة الرفع - المستثمرون يرفعون مستنداتهم
CREATE POLICY "Investors can upload payment documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'b2f-payment-receipts'
  );

-- سياسة القراءة - الجميع يمكنهم القراءة (لأن bucket public)
CREATE POLICY "Anyone can view payment documents"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'b2f-payment-receipts');

-- سياسة الحذف - فقط الإدارة
CREATE POLICY "Admins can delete payment documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'b2f-payment-receipts' AND
    is_b2f_admin(auth.uid())
  );
