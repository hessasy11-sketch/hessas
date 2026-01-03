/*
  # إضافة سياسة قراءة للطلبات (للاختبار)
  
  ## المشكلة
  - لا يوجد مستخدمين مسؤولين في جدول b2f_admin_users
  - دالة is_b2f_admin() ترجع false دائماً
  - لا أحد يستطيع رؤية الطلبات في قائمة التجميع
  
  ## الحل
  - إضافة سياسة مؤقتة للسماح برؤية الطلبات
  - للاختبار والتطوير فقط
  
  ## ملاحظة
  - يجب إزالة هذه السياسة في الإنتاج
  - يجب إضافة مستخدم مسؤول حقيقي
*/

-- إضافة سياسة للسماح للجميع برؤية الطلبات (للاختبار فقط)
DROP POLICY IF EXISTS "Allow anon to view sales requests for testing" ON b2f_sales_requests;

CREATE POLICY "Allow anon to view sales requests for testing"
  ON b2f_sales_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ملاحظة: هذه السياسة للتطوير والاختبار فقط
-- يجب إزالتها في الإنتاج
COMMENT ON POLICY "Allow anon to view sales requests for testing" ON b2f_sales_requests IS 
'سياسة مؤقتة للاختبار - يجب إزالتها في الإنتاج وإضافة مستخدم مسؤول حقيقي';
