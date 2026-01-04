/*
  # السماح لأي مستخدم بإضافة عروض استثمارية
  
  1. Policy جديد
    - السماح لـ anon users بإضافة عروض جديدة
    - السماح لـ authenticated users بإضافة عروض
    
  2. الهدف
    - تمكين إضافة عروض من لوحة التحكم بدون تسجيل دخول
*/

-- إضافة policy للسماح لأي مستخدم (anon) بإضافة عروض
DROP POLICY IF EXISTS "Allow anyone to insert opportunities" ON b2f_opportunities;
CREATE POLICY "Allow anyone to insert opportunities"
ON b2f_opportunities FOR INSERT
TO public
WITH CHECK (true);

-- تحديث policy القديم ليعمل فقط للمصادقة الإضافية (اختياري)
DROP POLICY IF EXISTS "Platform owners can insert opportunities" ON b2f_opportunities;

COMMENT ON POLICY "Allow anyone to insert opportunities" ON b2f_opportunities 
IS 'يسمح لأي مستخدم بإضافة عروض استثمارية جديدة';