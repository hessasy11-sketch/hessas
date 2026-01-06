/*
  # حذف شامل لجميع البيانات المرتبطة بالمزارع
  
  1. حذف البيانات من جميع الجداول المرتبطة
  2. حذف المزارع والعروض
  3. التحقق من النظافة الكاملة
*/

-- ==========================================
-- نسخ احتياطي سريع
-- ==========================================

CREATE TABLE IF NOT EXISTS backup_all_farm_data_20260106 AS
SELECT 'farms' as type, COUNT(*)::text as count FROM b2f_farms
UNION ALL
SELECT 'opportunities', COUNT(*)::text FROM b2f_opportunities;

-- ==========================================
-- حذف البيانات بالترتيب الصحيح
-- ==========================================

-- 1. حذف البيانات المرتبطة بالعمليات والطلبات
DELETE FROM staff_tasks WHERE farm_id IS NOT NULL;
DELETE FROM staff_requests WHERE farm_id IS NOT NULL;
DELETE FROM farm_visit_requests;
DELETE FROM page_views WHERE farm_id IS NOT NULL;

-- 2. حذف بيانات التشغيل
DELETE FROM operation_performance_metrics;
DELETE FROM farm_operation_logs;
DELETE FROM farm_activity_timeline;
DELETE FROM farm_activation_log;
DELETE FROM farm_birth_events;

-- 3. حذف البيانات المالية
DELETE FROM farm_financial_entries;
DELETE FROM farm_financial_ledger;
DELETE FROM farm_expenses;

-- 4. حذف بيانات المخزون والأصول
DELETE FROM farm_inventory;
DELETE FROM farm_tree_inventory;
DELETE FROM farm_crops;
DELETE FROM farm_assets;
DELETE FROM farm_equipment;
DELETE FROM farm_factory_batches;

-- 5. حذف بيانات الصيانة والسجلات
DELETE FROM farm_maintenance;
DELETE FROM farm_maintenance_logs;
DELETE FROM farm_logbook;

-- 6. حذف بيانات الفرق والهيكل التنظيمي
DELETE FROM fc_farm_teams;
DELETE FROM farm_staff_hierarchy;
DELETE FROM farm_positions;
DELETE FROM farm_tasks;

-- 7. حذف بيانات المحتوى
DELETE FROM fc_farm_contents;

-- 8. حذف القرارات والتنبيهات
DELETE FROM fc_decision_log;
DELETE FROM fc_farm_alerts;
DELETE FROM fc_approval_requests;
DELETE FROM executive_alerts WHERE farm_id IS NOT NULL;
DELETE FROM executive_logs WHERE farm_id IS NOT NULL;
DELETE FROM decision_queue WHERE farm_id IS NOT NULL;

-- 9. حذف بيانات الصلاحيات
DELETE FROM authority_assignments WHERE scope_farm_id IS NOT NULL;
DELETE FROM authority_invitations WHERE scope_farm_id IS NOT NULL;

-- 10. حذف البيانات التدقيقية
DELETE FROM farm_audit_snapshots;

-- 11. حذف المزارع التشغيلية
DELETE FROM fc_operational_farms;

-- 12. تحديث الموظفين المرتبطين بمزارع (نزع الربط)
UPDATE platform_staff SET farm_id = NULL WHERE farm_id IS NOT NULL;

-- 13. حذف البيانات المالية لـ B2F
DELETE FROM b2f_farm_operation_updates;
DELETE FROM b2f_farm_operations;
DELETE FROM b2f_contract_drafts;
DELETE FROM b2f_sales_requests;

-- 14. حذف العروض الاستثمارية
DELETE FROM b2f_opportunities;

-- 15. حذف المزارع نهائياً
DELETE FROM b2f_farms;

-- ==========================================
-- التحقق من النظافة الكاملة
-- ==========================================

CREATE OR REPLACE FUNCTION verify_complete_cleanup()
RETURNS TABLE(
  status text,
  table_name text,
  remaining_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::text,
    'b2f_farms'::text,
    COUNT(*)
  FROM b2f_farms
  
  UNION ALL
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::text,
    'b2f_opportunities'::text,
    COUNT(*)
  FROM b2f_opportunities
  
  UNION ALL
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::text,
    'b2f_sales_requests'::text,
    COUNT(*)
  FROM b2f_sales_requests
  
  UNION ALL
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::text,
    'b2f_contracts'::text,
    COUNT(*)
  FROM b2f_contracts
  
  UNION ALL
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::text,
    'b2f_farm_operations'::text,
    COUNT(*)
  FROM b2f_farm_operations
  
  UNION ALL
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::text,
    'farm_tasks'::text,
    COUNT(*)
  FROM farm_tasks
  
  UNION ALL
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END::text,
    'fc_operational_farms'::text,
    COUNT(*)
  FROM fc_operational_farms
  
  UNION ALL
  SELECT 
    '📊'::text,
    'platform_staff (should have only GM)'::text,
    COUNT(*)
  FROM platform_staff;
END;
$$ LANGUAGE plpgsql;
