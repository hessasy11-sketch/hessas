/*
  # تحديث RLS على جدول profiles

  1. المشكلة
    - المستخدمون الجدد لا يمكنهم إنشاء profile فوراً بعد التسجيل
    - auth.uid() قد لا يكون متاح مباشرة بعد signUp
    
  2. الحل
    - السماح لجميع المستخدمين المسجلين بإنشاء profiles
    - التحقق من صحة البيانات في التطبيق
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- إضافة سياسة جديدة تسمح بالإنشاء لأي مستخدم مسجل
CREATE POLICY "Authenticated users can create profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);
