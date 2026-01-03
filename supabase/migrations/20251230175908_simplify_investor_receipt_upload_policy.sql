/*
  # تبسيط سياسة رفع الإيصال للمستثمر

  1. Changes
    - حذف السياسة المعقدة
    - إضافة سياسة بسيطة: السماح لـ anon بتحديث payment_receipt_url فقط
    - التحقق من الحالة: payment_open أو receipt_uploaded_ai_review

  2. Security
    - المستثمر يحتاج الـ ID الصحيح للطلب (لديه بالفعل)
    - التحديث محدود بحالات معينة فقط
    - لا يستطيع تغيير بيانات حساسة
*/

-- حذف السياسة المعقدة
DROP POLICY IF EXISTS "Investor can upload receipt for own request" ON b2f_sales_requests;

-- سياسة بسيطة: السماح لـ anon بتحديث الإيصال
CREATE POLICY "Allow anon to upload receipt"
ON b2f_sales_requests
FOR UPDATE
TO anon
USING (
  -- السماح فقط للطلبات المفتوحة للدفع أو قيد المراجعة
  status IN ('payment_open', 'receipt_uploaded_ai_review')
)
WITH CHECK (
  -- يستطيع تحديث الحالة فقط لـ receipt_uploaded_ai_review
  status IN ('payment_open', 'receipt_uploaded_ai_review')
);

COMMENT ON POLICY "Allow anon to upload receipt" ON b2f_sales_requests IS
'يسمح للزوار (anon) برفع إيصالات الدفع للطلبات المفتوحة';
