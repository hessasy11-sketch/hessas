/*
  # ربط الفرق بنظام الأدوار
  
  ## التحديثات
  - إضافة role_id إلى fc_team_members
  - ربط إضافة عضو بالفريق بتعيينه تلقائياً في fc_user_farm_assignments
  - Trigger لمزامنة التعيينات
*/

-- إضافة role_id إلى fc_team_members
ALTER TABLE fc_team_members 
ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES fc_farm_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fc_team_members_role ON fc_team_members(role_id);

-- دالة لمزامنة إضافة عضو بالفريق مع التعيين في المزرعة
CREATE OR REPLACE FUNCTION sync_team_member_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_role_id uuid;
BEGIN
  -- الحصول على معرف المزرعة من الفريق
  SELECT operational_farm_id INTO v_farm_id
  FROM fc_teams
  WHERE id = NEW.team_id;
  
  -- استخدام الدور من العضو أو دور افتراضي (worker)
  v_role_id := NEW.role_id;
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM fc_farm_roles WHERE role_code = 'worker' LIMIT 1;
  END IF;
  
  -- إنشاء أو تحديث التعيين
  INSERT INTO fc_user_farm_assignments (
    user_id,
    operational_farm_id,
    role_id,
    is_active
  )
  VALUES (
    NEW.staff_id,
    v_farm_id,
    v_role_id,
    NEW.is_active
  )
  ON CONFLICT (user_id, operational_farm_id, role_id) 
  DO UPDATE SET 
    is_active = NEW.is_active,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger لمزامنة إضافة/تحديث عضو
DROP TRIGGER IF EXISTS sync_team_member_assignment_trigger ON fc_team_members;
CREATE TRIGGER sync_team_member_assignment_trigger
  AFTER INSERT OR UPDATE ON fc_team_members
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_member_assignment();

-- دالة لإضافة عضو للفريق مع دور
CREATE OR REPLACE FUNCTION add_team_member(
  p_team_id uuid,
  p_staff_id uuid,
  p_role_code text DEFAULT 'worker',
  p_role_in_team text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id uuid;
  v_member_id uuid;
  v_farm_id uuid;
BEGIN
  -- الحصول على معرف الدور
  SELECT id INTO v_role_id
  FROM fc_farm_roles
  WHERE role_code = p_role_code AND is_active = true;
  
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role code % not found', p_role_code;
  END IF;
  
  -- الحصول على المزرعة
  SELECT operational_farm_id INTO v_farm_id
  FROM fc_teams
  WHERE id = p_team_id;
  
  -- إضافة العضو للفريق
  INSERT INTO fc_team_members (
    team_id,
    staff_id,
    role_id,
    role_in_team,
    is_active
  )
  VALUES (
    p_team_id,
    p_staff_id,
    v_role_id,
    p_role_in_team,
    true
  )
  ON CONFLICT (team_id, staff_id) 
  DO UPDATE SET 
    role_id = v_role_id,
    role_in_team = p_role_in_team,
    is_active = true,
    joined_at = now()
  RETURNING id INTO v_member_id;
  
  -- إضافة حدث
  PERFORM add_farm_event(
    v_farm_id,
    'team_member_added',
    'إضافة عضو للفريق',
    'تم إضافة عضو جديد بدور ' || p_role_code,
    'info',
    NULL
  );
  
  RETURN v_member_id;
END;
$$;

COMMENT ON FUNCTION sync_team_member_assignment() IS 'مزامنة إضافة عضو بالفريق مع تعيينه في المزرعة';
COMMENT ON FUNCTION add_team_member(uuid, uuid, text, text) IS 'إضافة عضو للفريق مع دور محدد';