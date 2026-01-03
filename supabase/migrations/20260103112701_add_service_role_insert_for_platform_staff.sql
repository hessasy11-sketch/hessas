/*
  # إضافة سياسة service_role لإضافة الموظفين

  1. المشكلة:
    - قد لا تعمل الدوال المخصصة في بعض الحالات
    - نحتاج طريقة مباشرة للإضافة

  2. الحل:
    - إضافة سياسة service_role للسماح بالإضافة دائماً
    - هذا آمن لأن service_role يستخدم فقط من الكود الخلفي

  3. Security:
    - service_role لديه صلاحيات كاملة
*/

-- إضافة سياسة service_role للإضافة
CREATE POLICY "Service role can insert staff"
  ON platform_staff
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- إضافة سياسة service_role للتحديث
CREATE POLICY "Service role can update staff"
  ON platform_staff
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إضافة سياسة service_role للقراءة
CREATE POLICY "Service role can read staff"
  ON platform_staff
  FOR SELECT
  TO service_role
  USING (true);

-- إضافة سياسة service_role للحذف
CREATE POLICY "Service role can delete staff"
  ON platform_staff
  FOR DELETE
  TO service_role
  USING (true);

-- إضافة سياسة مؤقتة للمصادقين: السماح بالإضافة لأي مستخدم مصادق
-- يمكن تشديدها لاحقاً
DROP POLICY IF EXISTS "Authenticated users can insert staff" ON platform_staff;

CREATE POLICY "Authenticated users can insert staff"
  ON platform_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- تعليق توضيحي
COMMENT ON TABLE platform_staff IS 'جدول موظفي المنصة - سياسات RLS مفعلة مع service_role و authenticated';
