/*
  # إضافة سياسة حذف للطلبات (للاختبار)
  
  ## المشكلة
  - سياسة DELETE الحالية مقيدة بـ is_b2f_admin()
  - لا يوجد مسؤولين في النظام للاختبار
  - لا يمكن حذف الطلبات من قائمة التجميع
  
  ## الحل
  - إضافة سياسة مؤقتة للسماح بحذف الطلبات
  - للاختبار والتطوير فقط
  
  ## ملاحظة
  - يجب إزالة هذه السياسة في الإنتاج
  - يجب أن يكون الحذف متاحاً للمسؤولين فقط في الإنتاج
*/

-- إضافة سياسة حذف مؤقتة
DROP POLICY IF EXISTS "Allow anon to delete sales requests for testing" ON b2f_sales_requests;

CREATE POLICY "Allow anon to delete sales requests for testing"
  ON b2f_sales_requests
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ملاحظة: هذه السياسة للتطوير والاختبار فقط
COMMENT ON POLICY "Allow anon to delete sales requests for testing" ON b2f_sales_requests IS 
'سياسة مؤقتة للاختبار - يجب إزالتها في الإنتاج وقصر الحذف على المسؤولين فقط';
