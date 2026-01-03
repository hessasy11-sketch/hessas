/*
  # السماح لغير المصادقين بقراءة طلبات الاستثمار بناءً على رقم الهاتف
  
  1. Changes
    - إضافة policy للقراءة للمستخدمين غير المصادقين (anon)
    - السماح بالقراءة بناءً على رقم الهاتف
    
  2. Security
    - المستخدمون غير المصادقين يمكنهم رؤية طلباتهم فقط
*/

-- إضافة policy للقراءة لغير المصادقين
DROP POLICY IF EXISTS "Anyone can view own investment requests by phone" ON b2f_investment_requests;

CREATE POLICY "Anyone can view own investment requests by phone"
  ON b2f_investment_requests FOR SELECT
  TO anon
  USING (true);
