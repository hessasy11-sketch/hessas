/*
  # تحسين سياسة قراءة طلبات المبيعات
  
  1. المشكلة
    - السياسة الحالية تسمح لأي شخص برؤية جميع الطلبات
    - هذا خطأ أمني كبير
  
  2. الإصلاح
    - المستخدمون anon: لا يمكنهم قراءة أي شيء (لأنه لا توجد طريقة آمنة لتحديد هويتهم)
    - المستخدمون authenticated: يمكنهم رؤية طلباتهم فقط بناءً على رقم الهاتف المرتبط بحسابهم
    - الإدارة: يمكنهم رؤية كل شيء
*/

-- حذف السياسة القديمة غير الآمنة
DROP POLICY IF EXISTS "Anyone can view own sales requests by phone" ON b2f_sales_requests;

-- سياسة جديدة آمنة للمستخدمين المسجلين
CREATE POLICY "Authenticated users can view own sales requests"
  ON b2f_sales_requests FOR SELECT
  TO authenticated
  USING (
    -- يمكن رؤية الطلبات إذا كان المستخدم هو الإدارة
    is_b2f_admin(auth.uid())
    OR
    -- أو إذا كان الطلب مرتبط بحساب المستثمر الخاص به
    (
      investor_account_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM b2f_investor_accounts
        WHERE b2f_investor_accounts.id = b2f_sales_requests.investor_account_id
        AND b2f_investor_accounts.user_id = auth.uid()
      )
    )
  );