/*
  # إزالة نظام السيناريوهات بالكامل

  1. الحذف
    - حذف الدوال المتعلقة بالسيناريوهات
    - حذف جدول scenario_audit_logs
    - حذف جدول work_scenarios
    - إزالة الحقول المضافة من platform_staff
    
  2. الأمان
    - التأكد من عدم وجود بيانات مرتبطة قبل الحذف
    - حذف جميع السياسات والفهارس المتعلقة
*/

-- حذف الدوال المتعلقة بالسيناريوهات
DROP FUNCTION IF EXISTS get_active_scenario(uuid);
DROP FUNCTION IF EXISTS log_scenario_access(uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS check_scenario_permission(uuid, text);

-- حذف الفهارس
DROP INDEX IF EXISTS idx_work_scenarios_department;
DROP INDEX IF EXISTS idx_work_scenarios_is_active;
DROP INDEX IF EXISTS idx_scenario_audit_logs_staff_id;
DROP INDEX IF EXISTS idx_scenario_audit_logs_scenario_id;
DROP INDEX IF EXISTS idx_scenario_audit_logs_created_at;
DROP INDEX IF EXISTS idx_platform_staff_scenario_id;
DROP INDEX IF EXISTS idx_platform_staff_temp_scenario;

-- إزالة الحقول من platform_staff
ALTER TABLE platform_staff DROP COLUMN IF EXISTS scenario_id;
ALTER TABLE platform_staff DROP COLUMN IF EXISTS temp_scenario_id;
ALTER TABLE platform_staff DROP COLUMN IF EXISTS temp_until;

-- حذف الجداول
DROP TABLE IF EXISTS scenario_audit_logs CASCADE;
DROP TABLE IF EXISTS work_scenarios CASCADE;
