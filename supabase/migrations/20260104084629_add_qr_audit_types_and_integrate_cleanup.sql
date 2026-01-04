/*
  # إضافة أنواع Audit للـ QR وربط النظام بالأقسام

  1. توسيع Audit Logs:
    - إضافة action_type جديدة للـ QR
    - إضافة target_type للـ QR
  
  2. نظام التنظيف التلقائي:
    - Triggers للتعطيل/التفعيل/الحذف
    - دالات التنظيف والمزامنة
  
  3. الربط مع إدارة الأقسام:
    - حذف QR عند حذف موظف
    - تعطيل QR عند تعطيل موظف
    - مسح QR عند إزالة القسم
*/

-- 1. توسيع constraints للـ Audit Logs
ALTER TABLE platform_audit_logs DROP CONSTRAINT IF EXISTS platform_audit_logs_action_type_check;
ALTER TABLE platform_audit_logs ADD CONSTRAINT platform_audit_logs_action_type_check 
CHECK (action_type = ANY (ARRAY[
  'create_role'::text, 
  'update_role'::text, 
  'delete_role'::text, 
  'create_staff'::text, 
  'update_staff'::text, 
  'deactivate_staff'::text, 
  'activate_staff'::text, 
  'change_manager'::text, 
  'change_scope'::text, 
  'change_permissions'::text, 
  'create_team'::text, 
  'update_team'::text,
  -- QR Actions
  'generate_qr'::text,
  'auto_activate_qr'::text,
  'auto_deactivate_qr'::text,
  'auto_clear_qr'::text,
  'cascade_delete_qr'::text,
  'cleanup_qr'::text,
  'sync_qr'::text
]));

ALTER TABLE platform_audit_logs DROP CONSTRAINT IF EXISTS platform_audit_logs_target_type_check;
ALTER TABLE platform_audit_logs ADD CONSTRAINT platform_audit_logs_target_type_check 
CHECK (target_type = ANY (ARRAY[
  'staff'::text, 
  'role'::text, 
  'permission'::text, 
  'team'::text,
  'qr_code'::text,
  'platform_staff'::text
]));

-- 2. دالة للحصول على QR اليتيمة
CREATE OR REPLACE FUNCTION get_orphaned_qr_codes()
RETURNS TABLE(
  staff_id uuid,
  full_name text,
  staff_code text,
  qr_code text,
  is_active boolean,
  department text,
  last_seen timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id as staff_id,
    ps.full_name,
    ps.staff_code,
    ps.qr_code,
    ps.is_active,
    ps.department,
    ps.updated_at as last_seen
  FROM platform_staff ps
  WHERE ps.qr_code IS NOT NULL 
    AND ps.qr_code != ''
    AND (
      ps.is_active = false
      OR ps.department IS NULL
      OR ps.department = ''
    );
END;
$$;

-- 3. دالة لتنظيف QR اليتيمة
CREATE OR REPLACE FUNCTION cleanup_orphaned_qr_codes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deactivated integer := 0;
  v_cleared integer := 0;
BEGIN
  -- 1. تعطيل QR للموظفين المعطّلين
  UPDATE platform_staff
  SET 
    qr_is_active = false,
    updated_at = now()
  WHERE is_active = false 
    AND qr_is_active = true
    AND qr_code IS NOT NULL;
  
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- 2. مسح QR للموظفين بدون قسم
  UPDATE platform_staff
  SET 
    qr_code = NULL,
    qr_is_active = false,
    qr_generated_at = NULL,
    updated_at = now()
  WHERE (department IS NULL OR department = '')
    AND qr_code IS NOT NULL;
  
  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  -- تسجيل في Audit Log
  IF v_deactivated + v_cleared > 0 THEN
    INSERT INTO platform_audit_logs (
      action_type,
      target_type,
      metadata
    ) VALUES (
      'cleanup_qr',
      'qr_code',
      jsonb_build_object(
        'deactivated', v_deactivated,
        'cleared', v_cleared,
        'cleaned_at', now()
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deactivated_qr', v_deactivated,
    'cleared_qr', v_cleared,
    'message', 'تم تنظيف ' || (v_deactivated + v_cleared) || ' QR Code'
  );
END;
$$;

-- 4. دالة لمزامنة حالة QR مع حالة الموظف
CREATE OR REPLACE FUNCTION sync_qr_with_staff_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_synced integer := 0;
BEGIN
  UPDATE platform_staff
  SET 
    qr_is_active = is_active,
    updated_at = now()
  WHERE qr_is_active != is_active
    AND qr_code IS NOT NULL;
  
  GET DIAGNOSTICS v_synced = ROW_COUNT;

  IF v_synced > 0 THEN
    INSERT INTO platform_audit_logs (
      action_type,
      target_type,
      metadata
    ) VALUES (
      'sync_qr',
      'qr_code',
      jsonb_build_object(
        'synced_count', v_synced,
        'synced_at', now()
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'synced_count', v_synced,
    'message', 'تمت مزامنة ' || v_synced || ' QR Code'
  );
END;
$$;

-- 5. Trigger: تعطيل/تفعيل QR تلقائياً مع الموظف
CREATE OR REPLACE FUNCTION auto_deactivate_qr_on_staff_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تعطيل الموظف
  IF NEW.is_active = false AND OLD.is_active = true THEN
    NEW.qr_is_active := false;
    
    INSERT INTO platform_audit_logs (
      action_type,
      target_type,
      target_id,
      metadata
    ) VALUES (
      'auto_deactivate_qr',
      'platform_staff',
      NEW.id,
      jsonb_build_object(
        'staff_name', NEW.full_name,
        'staff_code', NEW.staff_code,
        'qr_code', NEW.qr_code,
        'reason', 'staff_deactivated'
      )
    );
  END IF;

  -- تفعيل الموظف
  IF NEW.is_active = true AND OLD.is_active = false AND NEW.qr_code IS NOT NULL THEN
    NEW.qr_is_active := true;
    
    INSERT INTO platform_audit_logs (
      action_type,
      target_type,
      target_id,
      metadata
    ) VALUES (
      'auto_activate_qr',
      'platform_staff',
      NEW.id,
      jsonb_build_object(
        'staff_name', NEW.full_name,
        'staff_code', NEW.staff_code,
        'qr_code', NEW.qr_code,
        'reason', 'staff_activated'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_deactivate_qr ON platform_staff;
CREATE TRIGGER trigger_auto_deactivate_qr
  BEFORE UPDATE ON platform_staff
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION auto_deactivate_qr_on_staff_deactivation();

-- 6. Trigger: مسح QR عند إزالة القسم
CREATE OR REPLACE FUNCTION auto_clear_qr_on_department_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.department IS NULL OR NEW.department = '') 
     AND (OLD.department IS NOT NULL AND OLD.department != '') THEN
    
    NEW.qr_code := NULL;
    NEW.qr_is_active := false;
    NEW.qr_generated_at := NULL;
    
    INSERT INTO platform_audit_logs (
      action_type,
      target_type,
      target_id,
      metadata
    ) VALUES (
      'auto_clear_qr',
      'platform_staff',
      NEW.id,
      jsonb_build_object(
        'staff_name', NEW.full_name,
        'staff_code', NEW.staff_code,
        'old_department', OLD.department,
        'reason', 'department_removed'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_clear_qr_on_dept_removal ON platform_staff;
CREATE TRIGGER trigger_auto_clear_qr_on_dept_removal
  BEFORE UPDATE ON platform_staff
  FOR EACH ROW
  WHEN (OLD.department IS DISTINCT FROM NEW.department)
  EXECUTE FUNCTION auto_clear_qr_on_department_removal();

-- 7. Trigger: تسجيل حذف QR
CREATE OR REPLACE FUNCTION cascade_delete_qr_on_staff_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO platform_audit_logs (
    action_type,
    target_type,
    target_id,
    metadata
  ) VALUES (
    'cascade_delete_qr',
    'platform_staff',
    OLD.id,
    jsonb_build_object(
      'staff_name', OLD.full_name,
      'staff_code', OLD.staff_code,
      'qr_code', OLD.qr_code,
      'department', OLD.department
    )
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cascade_delete_qr ON platform_staff;
CREATE TRIGGER trigger_cascade_delete_qr
  BEFORE DELETE ON platform_staff
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_qr_on_staff_delete();

-- 8. دالة تقرير التنظيف
CREATE OR REPLACE FUNCTION get_qr_cleanup_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_active integer;
  v_inactive_staff integer;
  v_no_department integer;
  v_orphaned integer;
  v_need_cleanup integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM platform_staff;
  
  SELECT COUNT(*) INTO v_active
  FROM platform_staff
  WHERE is_active = true AND qr_is_active = true AND qr_code IS NOT NULL;

  SELECT COUNT(*) INTO v_inactive_staff
  FROM platform_staff
  WHERE is_active = false AND qr_is_active = true;

  SELECT COUNT(*) INTO v_no_department
  FROM platform_staff
  WHERE (department IS NULL OR department = '') AND qr_code IS NOT NULL;

  SELECT COUNT(*) INTO v_orphaned
  FROM platform_staff
  WHERE qr_code IS NOT NULL
    AND (is_active = false OR department IS NULL OR department = '');

  v_need_cleanup := v_inactive_staff + v_no_department;

  RETURN jsonb_build_object(
    'total_staff', v_total,
    'active_qr', v_active,
    'inactive_staff_with_qr', v_inactive_staff,
    'no_department_with_qr', v_no_department,
    'orphaned_qr', v_orphaned,
    'need_cleanup', v_need_cleanup,
    'cleanup_needed', v_need_cleanup > 0,
    'health_status', CASE 
      WHEN v_need_cleanup = 0 THEN 'excellent'
      WHEN v_need_cleanup < 5 THEN 'good'
      WHEN v_need_cleanup < 10 THEN 'warning'
      ELSE 'critical'
    END
  );
END;
$$;

-- 9. دالة حذف موظف مع تنظيف كامل
CREATE OR REPLACE FUNCTION delete_staff_with_cleanup(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record record;
BEGIN
  SELECT * INTO v_staff_record
  FROM platform_staff
  WHERE id = p_staff_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'الموظف غير موجود');
  END IF;

  DELETE FROM department_staff_assignments WHERE staff_id = p_staff_id;
  UPDATE platform_staff SET pack_id = NULL WHERE id = p_staff_id;
  DELETE FROM platform_staff WHERE id = p_staff_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف الموظف وتنظيف جميع البيانات المرتبطة',
    'staff_name', v_staff_record.full_name,
    'staff_code', v_staff_record.staff_code,
    'qr_code', v_staff_record.qr_code
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_orphaned_qr_codes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_qr_codes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sync_qr_with_staff_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_qr_cleanup_report() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_staff_with_cleanup(uuid) TO authenticated, service_role;

-- تشغيل تنظيف أولي
SELECT cleanup_orphaned_qr_codes();
