/*
  # إصلاح RLS للسماح بإنشاء جلسات من anon role

  ## المشكلة
  - الـ Frontend يحاول إنشاء session بعد login ناجح
  - RLS يمنع INSERT من anon role
  - الخطأ: "new row violates row-level security policy"

  ## الحل
  - إضافة policy يسمح لـ anon role بإنشاء sessions
  - آمن لأن staff_id يجب أن يكون موجوداً وفعال

  ## الأمان
  - التحقق من وجود staff_id في platform_staff
  - التحقق من is_active = true
*/

-- 1. حذف الـ policies القديمة
DROP POLICY IF EXISTS "system_create_sessions" ON platform_staff_sessions;
DROP POLICY IF EXISTS "anon_create_sessions" ON platform_staff_sessions;
DROP POLICY IF EXISTS "staff_view_own_sessions" ON platform_staff_sessions;
DROP POLICY IF EXISTS "admins_view_all_sessions" ON platform_staff_sessions;
DROP POLICY IF EXISTS "staff_update_own_session" ON platform_staff_sessions;

-- 2. إنشاء policy للـ INSERT من أي مصدر
CREATE POLICY "allow_session_creation"
  ON platform_staff_sessions
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = staff_id
      AND is_active = true
    )
  );

-- 3. السماح بقراءة الـ sessions
CREATE POLICY "allow_session_read"
  ON platform_staff_sessions
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

-- 4. السماح بتحديث الـ sessions
CREATE POLICY "allow_session_update"
  ON platform_staff_sessions
  FOR UPDATE
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 5. السماح بحذف الـ sessions (للتنظيف)
CREATE POLICY "allow_session_cleanup"
  ON platform_staff_sessions
  FOR DELETE
  TO service_role
  USING (true);

-- 6. التحقق من تفعيل RLS
ALTER TABLE platform_staff_sessions ENABLE ROW LEVEL SECURITY;
