/*
  # إضافة أنواع إجراءات الجلسات إلى audit_logs

  ## المشكلة
  - القيد على action_type لا يسمح بـ 'login' و 'logout'
  
  ## الحل
  - إضافة 'login' و 'logout' إلى القيم المسموحة
  - إضافة 'platform_staff_sessions' إلى target_type
*/

-- حذف القيود القديمة
ALTER TABLE platform_audit_logs DROP CONSTRAINT IF EXISTS platform_audit_logs_action_type_check;
ALTER TABLE platform_audit_logs DROP CONSTRAINT IF EXISTS platform_audit_logs_target_type_check;

-- إضافة القيود الجديدة مع القيم الإضافية
ALTER TABLE platform_audit_logs 
ADD CONSTRAINT platform_audit_logs_action_type_check 
CHECK (action_type IN (
  -- الإجراءات الموجودة
  'create_role',
  'update_role',
  'delete_role',
  'create_staff',
  'update_staff',
  'deactivate_staff',
  'activate_staff',
  'change_manager',
  'change_scope',
  'change_permissions',
  'create_team',
  'update_team',
  'generate_qr',
  'auto_activate_qr',
  'auto_deactivate_qr',
  'auto_clear_qr',
  'cascade_delete_qr',
  'cleanup_qr',
  'sync_qr',
  'cleanup_orphaned_staff',
  'bulk_delete_staff',
  -- إجراءات الجلسات الجديدة
  'login',
  'logout',
  'session_expired',
  'session_renewed'
));

ALTER TABLE platform_audit_logs 
ADD CONSTRAINT platform_audit_logs_target_type_check 
CHECK (target_type IN (
  'staff',
  'role',
  'permission',
  'team',
  'qr_code',
  'platform_staff',
  'platform_staff_sessions'
));