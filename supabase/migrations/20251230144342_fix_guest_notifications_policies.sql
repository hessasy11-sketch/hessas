/*
  # إصلاح سياسات إشعارات الزوار

  1. التغييرات
    - حذف السياسات القديمة المعتمدة على is_b2f_admin()
    - إضافة سياسات جديدة تسمح للمستخدمين المصادقين بالإدارة الكاملة
    
  2. الأمان
    - المستخدمون المصادقون يمكنهم إنشاء وتعديل وحذف الإشعارات
    - الزوار وغير المسجلين يمكنهم فقط القراءة
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can create guest notifications" ON b2f_guest_notifications;
DROP POLICY IF EXISTS "Admins can update guest notifications" ON b2f_guest_notifications;
DROP POLICY IF EXISTS "Admins can delete guest notifications" ON b2f_guest_notifications;
DROP POLICY IF EXISTS "Admins can manage guest notifications" ON b2f_guest_notifications;

-- سياسة الإدراج: المستخدمون المصادقون فقط
CREATE POLICY "Authenticated users can create guest notifications"
  ON b2f_guest_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة التحديث: المستخدمون المصادقون فقط
CREATE POLICY "Authenticated users can update guest notifications"
  ON b2f_guest_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة الحذف: المستخدمون المصادقون فقط
CREATE POLICY "Authenticated users can delete guest notifications"
  ON b2f_guest_notifications
  FOR DELETE
  TO authenticated
  USING (true);
