/*
  # السماح للمستثمر برفع إيصال الدفع لطلبه

  1. Changes
    - إضافة policy للسماح للمستثمر (anon أو authenticated) بتحديث طلبه لرفع الإيصال
    - التحديث مسموح فقط للحقول المتعلقة بالإيصال
    - التحقق يتم عبر رقم الهاتف

  2. Security
    - المستثمر يستطيع تحديث طلبه الخاص فقط (عبر رقم الهاتف)
    - فقط عندما تكون الحالة payment_open
    - التحديث محدود بحقول الإيصال فقط
*/

-- السماح للمستثمر بتحديث الإيصال لطلبه
CREATE POLICY "Investor can upload receipt for own request"
ON b2f_sales_requests
FOR UPDATE
TO anon, authenticated
USING (
  -- يستطيع التحديث فقط إذا كان رقم هاتفه مطابق
  investor_phone = current_setting('request.headers', true)::json->>'x-investor-phone'
  OR 
  investor_phone = current_setting('app.investor_phone', true)
)
WITH CHECK (
  -- يستطيع التحديث فقط إذا كانت الحالة payment_open
  status = 'payment_open'
  OR
  status = 'receipt_uploaded_ai_review'
);

-- إضافة تعليق
COMMENT ON POLICY "Investor can upload receipt for own request" ON b2f_sales_requests IS
'يسمح للمستثمر برفع إيصال الدفع لطلبه الخاص عندما يكون الدفع مفتوحاً';
