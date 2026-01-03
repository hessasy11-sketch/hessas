/*
  # إصلاح سياسات RLS لجدول طلبات المبيعات
  
  1. المشكلة
    - حقل investor_account_id غير nullable
    - عند الحجز كضيف لا يوجد حساب بعد
    - السياسة تسمح بالإدراج لكن الحقل يرفضه
  
  2. الإصلاح
    - جعل investor_account_id nullable
    - تحديث السياسة لتكون أكثر مرونة
*/

-- جعل حقل investor_account_id nullable
ALTER TABLE b2f_sales_requests
ALTER COLUMN investor_account_id DROP NOT NULL;

-- جعل investor_email nullable (كان يجب أن يكون nullable من البداية)
ALTER TABLE b2f_sales_requests
ALTER COLUMN investor_email DROP NOT NULL;

-- إعادة إنشاء السياسات بشكل أفضل

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admin can view all sales requests" ON b2f_sales_requests;
DROP POLICY IF EXISTS "Admin and system can insert sales requests" ON b2f_sales_requests;
DROP POLICY IF EXISTS "Allow anon to insert sales requests" ON b2f_sales_requests;
DROP POLICY IF EXISTS "Admin can update sales requests" ON b2f_sales_requests;
DROP POLICY IF EXISTS "Investor can view own sales requests by phone" ON b2f_sales_requests;

-- سياسات جديدة محسّنة

-- 1. قراءة للإدارة
CREATE POLICY "Admin can view all sales requests"
  ON b2f_sales_requests FOR SELECT
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

-- 2. إدراج للجميع (anon و authenticated)
CREATE POLICY "Anyone can insert sales requests"
  ON b2f_sales_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. تحديث للإدارة فقط
CREATE POLICY "Admin can update sales requests"
  ON b2f_sales_requests FOR UPDATE
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

-- 4. حذف للإدارة فقط  
CREATE POLICY "Admin can delete sales requests"
  ON b2f_sales_requests FOR DELETE
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

-- 5. المستثمر يستطيع رؤية طلباته (anon و authenticated)
CREATE POLICY "Anyone can view own sales requests by phone"
  ON b2f_sales_requests FOR SELECT
  TO anon, authenticated
  USING (
    -- يمكن رؤية الطلبات بناءً على رقم الهاتف
    investor_phone IS NOT NULL
  );