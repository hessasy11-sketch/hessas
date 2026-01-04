/*
  # تنظيف شامل للموظفين مع جميع العلاقات (25 جدول)

  حذف/تحديث جميع العلاقات المرتبطة بالموظفين غير المعينين لأقسام
*/

-- 1. توسيع Audit Logs constraints
ALTER TABLE platform_audit_logs DROP CONSTRAINT IF EXISTS platform_audit_logs_action_type_check;
ALTER TABLE platform_audit_logs ADD CONSTRAINT platform_audit_logs_action_type_check 
CHECK (action_type = ANY (ARRAY[
  'create_role', 'update_role', 'delete_role', 'create_staff', 'update_staff', 
  'deactivate_staff', 'activate_staff', 'change_manager', 'change_scope', 
  'change_permissions', 'create_team', 'update_team', 'generate_qr', 
  'auto_activate_qr', 'auto_deactivate_qr', 'auto_clear_qr', 'cascade_delete_qr',
  'cleanup_qr', 'sync_qr', 'cleanup_orphaned_staff', 'bulk_delete_staff'
]::text[]));

-- 2. حذف/تحديث جميع العلاقات

-- admin_operations_audit
UPDATE admin_operations_audit SET admin_staff_id = NULL 
WHERE admin_staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

UPDATE admin_operations_audit SET target_staff_id = NULL 
WHERE target_staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- auto_generated_tasks_log
DELETE FROM auto_generated_tasks_log WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- auto_task_rules
UPDATE auto_task_rules SET created_by = NULL WHERE created_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- b2f_contracts
UPDATE b2f_contracts SET issued_by = NULL WHERE issued_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- department_permissions
UPDATE department_permissions SET granted_by = NULL WHERE granted_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- department_staff_assignments (assigned_by only, not staff_id!)
UPDATE department_staff_assignments SET assigned_by = NULL WHERE assigned_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- department_tasks
UPDATE department_tasks SET assigned_by = NULL WHERE assigned_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);
UPDATE department_tasks SET assigned_to = NULL WHERE assigned_to IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- investor_action_requests
UPDATE investor_action_requests SET handled_by = NULL WHERE handled_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- permission_packs
UPDATE permission_packs SET created_by = NULL WHERE created_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- platform_departments
UPDATE platform_departments SET created_by = NULL WHERE created_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- platform_staff (reports_to)
UPDATE platform_staff SET reports_to_staff_id = NULL WHERE reports_to_staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- staff_access_devices
DELETE FROM staff_access_devices WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- staff_access_log
DELETE FROM staff_access_log WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- staff_achievements
DELETE FROM staff_achievements WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- staff_permissions
DELETE FROM staff_permissions WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- staff_tasks
UPDATE staff_tasks SET assigned_by = NULL WHERE assigned_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);
DELETE FROM staff_tasks WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);
UPDATE staff_tasks SET approved_by = NULL WHERE approved_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- staff_teams
DELETE FROM staff_teams WHERE team_leader_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- task_analytics
DELETE FROM task_analytics WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- task_templates
UPDATE task_templates SET created_by = NULL WHERE created_by IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- team_members
DELETE FROM team_members WHERE staff_id IN (SELECT ps.id FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL);

-- 3. تسجيل في Audit Logs
DO $$
DECLARE v_to_delete jsonb; v_count int;
BEGIN
  SELECT jsonb_agg(jsonb_build_object('id', ps.id, 'name', ps.full_name, 'code', ps.staff_code, 'dept', ps.department, 'role', ps.role, 'qr', ps.qr_code IS NOT NULL)), COUNT(*) 
  INTO v_to_delete, v_count FROM platform_staff ps LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id WHERE dsa.id IS NULL;

  IF v_count > 0 THEN
    INSERT INTO platform_audit_logs (action_type, target_type, metadata) VALUES 
    ('cleanup_orphaned_staff', 'platform_staff', jsonb_build_object('deleted_count', v_count, 'deleted_staff', v_to_delete, 'reason', 'no_department_assignment', 'cleaned_at', now()));
  END IF;
END $$;

-- 4. حذف الموظفين
DELETE FROM platform_staff ps WHERE NOT EXISTS (SELECT 1 FROM department_staff_assignments dsa WHERE dsa.staff_id = ps.id);

-- 5. دالة التحقق
CREATE OR REPLACE FUNCTION verify_staff_cleanup() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total int; v_with int; v_without int; v_qr int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM platform_staff;
  SELECT COUNT(*) INTO v_with FROM platform_staff ps WHERE EXISTS (SELECT 1 FROM department_staff_assignments dsa WHERE dsa.staff_id = ps.id);
  SELECT COUNT(*) INTO v_without FROM platform_staff ps WHERE NOT EXISTS (SELECT 1 FROM department_staff_assignments dsa WHERE dsa.staff_id = ps.id);
  SELECT COUNT(*) INTO v_qr FROM platform_staff WHERE qr_code IS NOT NULL;
  RETURN jsonb_build_object('total_staff', v_total, 'with_assignments', v_with, 'without_assignments', v_without, 'with_qr', v_qr, 'is_clean', v_without = 0, 'status', CASE WHEN v_without = 0 THEN 'نظيف ✅' ELSE 'يحتاج تنظيف ⚠️' END);
END; $$;
GRANT EXECUTE ON FUNCTION verify_staff_cleanup() TO authenticated, service_role;

-- 6. التحقق
SELECT verify_staff_cleanup();
SELECT id, full_name, staff_code, department, role FROM platform_staff ORDER BY full_name;
