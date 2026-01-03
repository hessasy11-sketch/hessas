/*
  # إصلاح سياسات رفع إيصالات B2F بشكل نهائي

  1. التأكد من وجود bucket "receipts"
  2. التأكد من وجود جميع السياسات المطلوبة
  3. منح صلاحيات anon لرفع الإيصالات في مجلد b2f-payments
  
  المشكلة:
  - قد تكون السياسات غير مطبقة بشكل صحيح
  - قد يكون هناك تضارب في السياسات
  
  الحل:
  - حذف جميع السياسات القديمة
  - إنشاء سياسات جديدة بصلاحيات صحيحة
*/

-- ====================================
-- التحقق من bucket receipts
-- ====================================

-- التأكد من أن bucket receipts موجود
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- ====================================
-- حذف السياسات القديمة
-- ====================================

DROP POLICY IF EXISTS "B2F investors can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "B2F investors can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "B2F investors can update payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete B2F payment receipts" ON storage.objects;

-- ====================================
-- إنشاء السياسات الجديدة
-- ====================================

-- 1. سياسة رفع الإيصالات: anon يمكنه رفع في b2f-payments
CREATE POLICY "B2F investors can upload payment receipts"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = 'b2f-payments'
);

-- 2. سياسة عرض الإيصالات: public يمكنه عرض b2f-payments
CREATE POLICY "B2F investors can view payment receipts"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = 'b2f-payments'
);

-- 3. سياسة تحديث الإيصالات: anon يمكنه تحديث في b2f-payments
CREATE POLICY "B2F investors can update payment receipts"
ON storage.objects FOR UPDATE
TO anon
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = 'b2f-payments'
)
WITH CHECK (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = 'b2f-payments'
);

-- 4. سياسة حذف الإيصالات: authenticated و anon يمكنهما الحذف
CREATE POLICY "Admins can delete B2F payment receipts"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'receipts' AND 
  (storage.foldername(name))[1] = 'b2f-payments'
);

-- ====================================
-- التحقق من السياسات
-- ====================================

-- عرض جميع السياسات المتعلقة بـ B2F
DO $$
BEGIN
  RAISE NOTICE 'تم إنشاء السياسات التالية:';
  RAISE NOTICE '1. B2F investors can upload payment receipts (anon)';
  RAISE NOTICE '2. B2F investors can view payment receipts (public)';
  RAISE NOTICE '3. B2F investors can update payment receipts (anon)';
  RAISE NOTICE '4. Admins can delete B2F payment receipts (public)';
  RAISE NOTICE 'جميع السياسات تم تطبيقها بنجاح!';
END $$;
