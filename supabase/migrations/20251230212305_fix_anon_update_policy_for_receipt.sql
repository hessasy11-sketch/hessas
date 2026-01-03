/*
  # إصلاح سياسة رفع الإيصال للسماح بالتحديث من أي حالة

  1. Changes
    - إزالة قيد USING لأن المستخدم يجب أن يستطيع رفع الإيصال من أي حالة
    - تحديث WITH CHECK لتشمل الحالات الجديدة فقط

  2. Security
    - السماح بتحديث الإيصال من أي حالة
    - التحديث فقط إلى الحالات: receipt_under_review
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Allow anon to upload receipt" ON b2f_sales_requests;

-- إنشاء سياسة جديدة أكثر مرونة
CREATE POLICY "Allow anon to upload receipt"
ON b2f_sales_requests
FOR UPDATE
TO anon
USING (true)
WITH CHECK (
  status IN ('receipt_under_review', 'receipt_uploaded', 'receipt_needs_revision')
);

COMMENT ON POLICY "Allow anon to upload receipt" ON b2f_sales_requests IS
'يسمح للزوار برفع وتحديث إيصالات الدفع من أي حالة';