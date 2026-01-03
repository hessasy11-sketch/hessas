/*
  # تحديث سياسة رفع الإيصال بالحالات الصحيحة

  1. Changes
    - تحديث policy لتشمل الحالات الصحيحة من constraint
    - إزالة الحالة الخاطئة receipt_uploaded_ai_review

  2. Security
    - السماح للتحديث فقط للحالات: payment_open, receipt_uploaded, receipt_under_review
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Allow anon to upload receipt" ON b2f_sales_requests;

-- إنشاء السياسة الصحيحة
CREATE POLICY "Allow anon to upload receipt"
ON b2f_sales_requests
FOR UPDATE
TO anon
USING (
  -- السماح للطلبات المفتوحة للدفع أو التي تم رفع إيصالها
  status IN ('payment_open', 'receipt_uploaded', 'receipt_under_review')
)
WITH CHECK (
  -- يستطيع التحديث لهذه الحالات
  status IN ('payment_open', 'receipt_uploaded', 'receipt_under_review')
);

COMMENT ON POLICY "Allow anon to upload receipt" ON b2f_sales_requests IS
'يسمح للزوار برفع وتحديث إيصالات الدفع';
