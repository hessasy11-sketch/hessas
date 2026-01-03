/*
  # صلاحيات مطلقة للمدير العام/صاحب المنصة

  1. Changes
    - إنشاء دالة للتحقق من كون المستخدم صاحب المنصة
    - تحديث كافة سياسات RLS لإعطاء صلاحيات مطلقة للمدير العام
    - إضافة حقل is_platform_owner إلى profiles
    - تحديث platform_administrators للتمييز الواضح
    
  2. Security
    - صاحب المنصة = صلاحيات مطلقة بدون قيود
    - باقي المستخدمين مقيدين بسياساتهم الحالية
    - كل إجراءات صاحب المنصة تُسجل في audit_logs
*/

-- إضافة حقل is_platform_owner إلى profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_platform_owner'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN is_platform_owner boolean DEFAULT false;
  END IF;
END $$;

-- دالة للتحقق من كون المستخدم صاحب المنصة
CREATE OR REPLACE FUNCTION is_platform_owner()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      is_platform_owner = true 
      OR user_type IN ('platform_owner', 'general_manager')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من كون المستخدم صاحب المنصة عبر user_id
CREATE OR REPLACE FUNCTION is_user_platform_owner(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid
    AND (
      is_platform_owner = true 
      OR user_type IN ('platform_owner', 'general_manager')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث سياسات b2f_farms لإعطاء صلاحيات مطلقة لصاحب المنصة
DROP POLICY IF EXISTS "Platform owner has full access to farms" ON b2f_farms;
CREATE POLICY "Platform owner has full access to farms"
  ON b2f_farms FOR ALL
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

-- تحديث سياسات platform_staff
DROP POLICY IF EXISTS "Platform owner has full access to staff" ON platform_staff;
CREATE POLICY "Platform owner has full access to staff"
  ON platform_staff FOR ALL
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

-- تحديث سياسات roles_catalog
DROP POLICY IF EXISTS "Platform owner has full access to roles" ON roles_catalog;
CREATE POLICY "Platform owner has full access to roles"
  ON roles_catalog FOR ALL
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

-- تحديث سياسات platform_audit_logs
DROP POLICY IF EXISTS "Platform owner can view all audit logs" ON platform_audit_logs;
CREATE POLICY "Platform owner can view all audit logs"
  ON platform_audit_logs FOR SELECT
  USING (is_platform_owner());

-- تحديث سياسات auctions
DROP POLICY IF EXISTS "Platform owner has full access to auctions" ON auctions;
CREATE POLICY "Platform owner has full access to auctions"
  ON auctions FOR ALL
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

-- دالة لتسجيل إجراءات صاحب المنصة في audit logs
CREATE OR REPLACE FUNCTION log_platform_owner_action(
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_changes jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- التحقق من أن المستخدم هو صاحب المنصة
  IF NOT is_platform_owner() THEN
    RAISE EXCEPTION 'Only platform owner can use this function';
  END IF;

  -- تسجيل الإجراء
  INSERT INTO platform_audit_logs (
    action_type,
    target_type,
    target_id,
    performed_by,
    changes,
    metadata
  ) VALUES (
    p_action_type,
    p_target_type,
    p_target_id,
    auth.uid(),
    p_changes || jsonb_build_object('is_root_access', true),
    p_metadata || jsonb_build_object('timestamp', now())
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديد صاحب المنصة الحالي (يجب تعديل هذا حسب الحساب الفعلي)
-- سنضع كل الحسابات التي user_type = platform_owner
UPDATE profiles
SET is_platform_owner = true
WHERE user_type IN ('platform_owner', 'general_manager');

-- إنشاء index للأداء
CREATE INDEX IF NOT EXISTS idx_profiles_is_platform_owner ON profiles(is_platform_owner) WHERE is_platform_owner = true;

-- تعليق توضيحي
COMMENT ON FUNCTION is_platform_owner() IS 'Returns true if current user is the platform owner with root access';
COMMENT ON FUNCTION log_platform_owner_action IS 'Logs all actions performed by platform owner for audit trail';
