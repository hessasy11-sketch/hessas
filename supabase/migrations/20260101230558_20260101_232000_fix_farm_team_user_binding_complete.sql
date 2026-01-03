/*
  # إصلاح ربط فريق المزرعة بالمستخدمين - الحل الجذري
  
  1. إنشاء مستخدمين تجريبيين للمدير والمشرف
  2. ربط السجلات الحالية بالمستخدمين
  3. إضافة قيود لمنع NULL في user_id
  4. تحديث منطق العرض
  
  الهدف: جعل user_id هو الأساس في إظهار التبويبات
*/

-- 1. إنشاء مستخدمين تجريبيين في auth.users
-- مستخدم المدير
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'manager@farm.test',
  crypt('manager123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"أحمد المدير","role":"farm_manager"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

-- مستخدم المشرف
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'supervisor@farm.test',
  crypt('supervisor123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"علي المشرف","role":"farm_supervisor"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

-- 2. ربط السجلات الحالية بالمستخدمين
-- ربط المدير
UPDATE farm_team_members
SET 
  user_id = '11111111-1111-1111-1111-111111111111'::uuid,
  updated_at = now()
WHERE role = 'farm_manager' 
  AND (user_id IS NULL OR user_id = '11111111-1111-1111-1111-111111111111'::uuid)
  AND email = 'manager@example.com';

-- ربط المشرف
UPDATE farm_team_members
SET 
  user_id = '22222222-2222-2222-2222-222222222222'::uuid,
  updated_at = now()
WHERE role = 'farm_supervisor' 
  AND (user_id IS NULL OR user_id = '22222222-2222-2222-2222-222222222222'::uuid)
  AND email = 'supervisor@example.com';

-- 3. تحديث الإيميلات لتتطابق
UPDATE farm_team_members
SET 
  email = 'manager@farm.test',
  updated_at = now()
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE farm_team_members
SET 
  email = 'supervisor@farm.test',
  updated_at = now()
WHERE user_id = '22222222-2222-2222-2222-222222222222'::uuid;

-- 4. إنشاء دالة للربط التلقائي
CREATE OR REPLACE FUNCTION auto_bind_farm_team_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إذا لم يكن user_id محدداً، حاول الربط بناءً على الإيميل أو الهاتف
  IF NEW.user_id IS NULL THEN
    -- البحث بالإيميل أولاً
    IF NEW.email IS NOT NULL THEN
      SELECT id INTO NEW.user_id
      FROM auth.users
      WHERE email = NEW.email
      LIMIT 1;
    END IF;
    
    -- إذا لم يجد، ابحث بالهاتف
    IF NEW.user_id IS NULL AND NEW.phone IS NOT NULL THEN
      SELECT id INTO NEW.user_id
      FROM auth.users
      WHERE phone = NEW.phone
      LIMIT 1;
    END IF;
    
    -- إذا لم يجد أي مستخدم، ارفع خطأ
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'لا يمكن إضافة عضو فريق بدون ربطه بمستخدم. يرجى التأكد من وجود المستخدم أولاً.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- تطبيق الدالة على الإدراج والتحديث
DROP TRIGGER IF EXISTS ensure_farm_team_user_binding ON farm_team_members;
CREATE TRIGGER ensure_farm_team_user_binding
  BEFORE INSERT OR UPDATE ON farm_team_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_bind_farm_team_to_user();

-- 5. إنشاء دالة لفحص دور المستخدم في فريق المزرعة
CREATE OR REPLACE FUNCTION get_user_farm_role(check_user_id UUID, check_farm_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM farm_team_members
  WHERE user_id = check_user_id
    AND farm_id = check_farm_id
    AND is_active = true
  LIMIT 1;
$$;

-- 6. إنشاء دالة لفحص هل المستخدم مدير نظام
CREATE OR REPLACE FUNCTION is_system_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM b2f_admin_users
    WHERE user_id = COALESCE(check_user_id, auth.uid())
      AND role IN ('super_admin', 'admin')
  );
$$;

-- 7. إنشاء view لعرض معلومات الفريق مع بيانات المستخدم
CREATE OR REPLACE VIEW farm_team_with_user_info AS
SELECT 
  ftm.id,
  ftm.farm_id,
  ftm.user_id,
  ftm.role,
  ftm.full_name,
  ftm.phone,
  ftm.email,
  ftm.is_active,
  ftm.assigned_at,
  ftm.created_at,
  ftm.updated_at,
  au.email as user_email,
  au.raw_user_meta_data->>'full_name' as user_full_name
FROM farm_team_members ftm
LEFT JOIN auth.users au ON au.id = ftm.user_id;

-- 8. منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_user_farm_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_system_admin TO authenticated, anon;
GRANT SELECT ON farm_team_with_user_info TO authenticated, anon;

-- 9. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_farm_team_user_farm_active 
  ON farm_team_members(user_id, farm_id, is_active) 
  WHERE user_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_farm_team_role_active 
  ON farm_team_members(role, is_active) 
  WHERE is_active = true;

-- 10. إضافة تعليق توضيحي
COMMENT ON TABLE farm_team_members IS 'فريق المزرعة - يجب ربط كل عضو بـ user_id من auth.users';
COMMENT ON COLUMN farm_team_members.user_id IS 'مطلوب - يجب ربط كل عضو بمستخدم في النظام';
COMMENT ON FUNCTION auto_bind_farm_team_to_user IS 'ربط تلقائي لأعضاء الفريق بالمستخدمين بناءً على الإيميل أو الهاتف';
