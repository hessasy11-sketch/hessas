/*
  # إضافة سياسات bucket الإيصالات لـ B2F عبر دالة

  1. إنشاء دالة تضيف السياسات
  2. تنفيذ الدالة
  3. حذف الدالة
*/

-- ===================================
-- 1. إنشاء دالة لإضافة السياسات
-- ===================================

CREATE OR REPLACE FUNCTION add_b2f_receipt_policies()
RETURNS void AS $$
BEGIN
  -- حذف السياسات القديمة إن وجدت
  DROP POLICY IF EXISTS "B2F investors can upload payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "B2F investors can view payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "B2F investors can update payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete B2F payment receipts" ON storage.objects;
  
  -- سياسة الرفع لـ anon
  EXECUTE 'CREATE POLICY "B2F investors can upload payment receipts" ' ||
          'ON storage.objects FOR INSERT ' ||
          'TO anon ' ||
          'WITH CHECK (' ||
          '  bucket_id = ''receipts'' AND ' ||
          '  (storage.foldername(name))[1] = ''b2f-payments''' ||
          ')';
  
  -- سياسة العرض لـ anon
  EXECUTE 'CREATE POLICY "B2F investors can view payment receipts" ' ||
          'ON storage.objects FOR SELECT ' ||
          'TO anon ' ||
          'USING (' ||
          '  bucket_id = ''receipts'' AND ' ||
          '  (storage.foldername(name))[1] = ''b2f-payments''' ||
          ')';
  
  -- سياسة التحديث لـ anon
  EXECUTE 'CREATE POLICY "B2F investors can update payment receipts" ' ||
          'ON storage.objects FOR UPDATE ' ||
          'TO anon ' ||
          'USING (' ||
          '  bucket_id = ''receipts'' AND ' ||
          '  (storage.foldername(name))[1] = ''b2f-payments''' ||
          ') ' ||
          'WITH CHECK (' ||
          '  bucket_id = ''receipts'' AND ' ||
          '  (storage.foldername(name))[1] = ''b2f-payments''' ||
          ')';
  
  -- سياسة الحذف لـ authenticated
  EXECUTE 'CREATE POLICY "Admins can delete B2F payment receipts" ' ||
          'ON storage.objects FOR DELETE ' ||
          'TO authenticated ' ||
          'USING (' ||
          '  bucket_id = ''receipts'' AND ' ||
          '  (storage.foldername(name))[1] = ''b2f-payments''' ||
          ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 2. تنفيذ الدالة
-- ===================================

SELECT add_b2f_receipt_policies();

-- ===================================
-- 3. حذف الدالة
-- ===================================

DROP FUNCTION IF EXISTS add_b2f_receipt_policies();

-- ===================================
-- النهاية
-- ===================================
