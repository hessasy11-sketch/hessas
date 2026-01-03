/*
  # إصلاح سياسات تخزين إيصالات B2F لدعم anon

  1. المشكلة:
    - المستثمرون غير مسجلين في Auth (يستخدمون anon)
    - السياسات الحالية تتطلب authenticated فقط
    - نتيجة: فشل رفع الإيصال

  2. الحل:
    - السماح لـ anon برفع الإيصالات
    - السماح لـ anon بعرض الإيصالات
    - السماح لـ anon بتحديث الإيصالات
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "المستثمرون يمكنهم رفع إيصالاتهم" ON storage.objects;
DROP POLICY IF EXISTS "المستثمرون يمكنهم عرض إيصالاتهم" ON storage.objects;
DROP POLICY IF EXISTS "المستثمرون يمكنهم تحديث إيصالاتهم" ON storage.objects;
DROP POLICY IF EXISTS "المستثمرون يمكنهم حذف إيصالاتهم" ON storage.objects;

-- سياسة رفع الإيصالات: يمكن لأي شخص (anon + authenticated) رفع إيصال
CREATE POLICY "anon can upload receipts"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'b2f-payment-receipts');

-- سياسة عرض الإيصالات: يمكن للجميع عرضها
CREATE POLICY "anon can view receipts"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'b2f-payment-receipts');

-- سياسة تحديث الإيصالات: يمكن للجميع تحديثها (للـ upsert)
CREATE POLICY "anon can update receipts"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'b2f-payment-receipts')
WITH CHECK (bucket_id = 'b2f-payment-receipts');

-- سياسة حذف الإيصالات: يمكن للجميع حذفها
CREATE POLICY "anon can delete receipts"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'b2f-payment-receipts');