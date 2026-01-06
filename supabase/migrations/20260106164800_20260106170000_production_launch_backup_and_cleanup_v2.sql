/*
  # إعداد نظام B2F للإطلاق الرسمي - نسخة 2
  
  1. النسخ الاحتياطي (Backup)
    - إنشاء جداول نسخ احتياطي لجميع البيانات الحالية
    - نسخ جميع البيانات التجريبية قبل الحذف
  
  2. التنظيف الكامل
    - حذف جميع المستثمرين التجريبيين
    - حذف جميع الطلبات والحجوزات والعقود
    - حذف جميع العمليات التشغيلية التجريبية
    - تنظيف Decision Queue والسجلات
    
  3. البيانات المحفوظة
    - حساب General Manager
    - المزارع والعروض الاستثمارية
    - إعدادات النظام
*/

-- ==========================================
-- المرحلة 1: النسخ الاحتياطي الكامل
-- ==========================================

-- نسخ المستثمرين
CREATE TABLE IF NOT EXISTS backup_b2f_investor_accounts_20260106 AS
SELECT * FROM b2f_investor_accounts;

-- نسخ الطلبات
CREATE TABLE IF NOT EXISTS backup_b2f_sales_requests_20260106 AS
SELECT * FROM b2f_sales_requests;

-- نسخ العقود
CREATE TABLE IF NOT EXISTS backup_b2f_contracts_20260106 AS
SELECT * FROM b2f_contracts;

-- نسخ مسودات العقود
CREATE TABLE IF NOT EXISTS backup_b2f_contract_drafts_20260106 AS
SELECT * FROM b2f_contract_drafts;

-- نسخ العمليات التشغيلية
CREATE TABLE IF NOT EXISTS backup_b2f_farm_operations_20260106 AS
SELECT * FROM b2f_farm_operations;

-- نسخ تحديثات العمليات
CREATE TABLE IF NOT EXISTS backup_b2f_farm_operation_updates_20260106 AS
SELECT * FROM b2f_farm_operation_updates;

-- نسخ مراحل العمليات
CREATE TABLE IF NOT EXISTS backup_b2f_farm_operation_phases_20260106 AS
SELECT * FROM b2f_farm_operation_phases;

-- نسخ الفواتير
CREATE TABLE IF NOT EXISTS backup_b2f_invoices_20260106 AS
SELECT * FROM b2f_invoices;

-- نسخ الإيصالات
CREATE TABLE IF NOT EXISTS backup_b2f_payment_receipts_20260106 AS
SELECT * FROM b2f_payment_receipts;

-- نسخ الإشعارات
CREATE TABLE IF NOT EXISTS backup_b2f_notifications_20260106 AS
SELECT * FROM b2f_notifications;

-- نسخ إشعارات الضيوف
CREATE TABLE IF NOT EXISTS backup_b2f_guest_notifications_20260106 AS
SELECT * FROM b2f_guest_notifications;

-- نسخ سجل العمليات المالية
CREATE TABLE IF NOT EXISTS backup_b2f_financial_operations_log_20260106 AS
SELECT * FROM b2f_financial_operations_log;

-- نسخ Decision Queue
CREATE TABLE IF NOT EXISTS backup_decision_queue_20260106 AS
SELECT * FROM decision_queue;

-- نسخ Executive Decisions Log (إذا كان موجوداً)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'executive_decisions_log') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS backup_executive_decisions_log_20260106 AS SELECT * FROM executive_decisions_log';
  END IF;
END $$;

-- ==========================================
-- المرحلة 2: التنظيف الكامل
-- ==========================================

-- حذف الإشعارات
DELETE FROM b2f_guest_notifications;
DELETE FROM b2f_notifications;

-- حذف العمليات التشغيلية
DELETE FROM b2f_farm_operation_phases;
DELETE FROM b2f_farm_operation_updates;
DELETE FROM b2f_farm_operations;

-- حذف البيانات المالية
DELETE FROM b2f_payment_receipts;
DELETE FROM b2f_financial_operations_log;
DELETE FROM b2f_invoices;

-- حذف العقود
DELETE FROM b2f_contract_transfers WHERE EXISTS (SELECT 1);
DELETE FROM b2f_contract_drafts;
DELETE FROM b2f_contracts;

-- حذف الطلبات
DELETE FROM b2f_sales_requests;

-- حذف المستثمرين
DELETE FROM b2f_investor_accounts;

-- تنظيف Decision Queue
DELETE FROM decision_queue WHERE farm_id IS NOT NULL;

-- تنظيف Executive Logs
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'executive_decisions_log') THEN
    EXECUTE 'DELETE FROM executive_decisions_log WHERE farm_id IS NOT NULL';
  END IF;
END $$;

-- ==========================================
-- المرحلة 3: دالة التحقق من النظافة
-- ==========================================

CREATE OR REPLACE FUNCTION check_b2f_cleanup_status()
RETURNS TABLE(
  item text,
  count bigint,
  status text
) AS $$
BEGIN
  RETURN QUERY
  -- الجداول التي يجب أن تكون فارغة
  SELECT 
    'مستثمرين (يجب أن يكون 0)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) = 0 THEN '✓ نظيف' ELSE '✗ يحتاج تنظيف' END::text
  FROM b2f_investor_accounts
  
  UNION ALL
  SELECT 
    'طلبات مبيعات (يجب أن يكون 0)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) = 0 THEN '✓ نظيف' ELSE '✗ يحتاج تنظيف' END::text
  FROM b2f_sales_requests
  
  UNION ALL
  SELECT 
    'عقود (يجب أن يكون 0)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) = 0 THEN '✓ نظيف' ELSE '✗ يحتاج تنظيف' END::text
  FROM b2f_contracts
  
  UNION ALL
  SELECT 
    'عمليات تشغيلية (يجب أن يكون 0)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) = 0 THEN '✓ نظيف' ELSE '✗ يحتاج تنظيف' END::text
  FROM b2f_farm_operations
  
  UNION ALL
  SELECT 
    'قرارات منتظرة (يجب أن يكون 0)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) = 0 THEN '✓ نظيف' ELSE '✗ يحتاج تنظيف' END::text
  FROM decision_queue WHERE farm_id IS NOT NULL
  
  UNION ALL
  SELECT 
    'إشعارات (يجب أن يكون 0)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) = 0 THEN '✓ نظيف' ELSE '✗ يحتاج تنظيف' END::text
  FROM b2f_notifications
  
  -- البيانات التي يجب أن تبقى
  UNION ALL
  SELECT 
    'مزارع (يجب أن توجد)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) > 0 THEN '✓ موجودة' ELSE '✗ غير موجودة' END::text
  FROM b2f_farms
  
  UNION ALL
  SELECT 
    'عروض استثمارية (يجب أن توجد)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) > 0 THEN '✓ موجودة' ELSE '✗ غير موجودة' END::text
  FROM b2f_opportunities
  
  UNION ALL
  SELECT 
    'General Manager (يجب أن يوجد)'::text,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) > 0 THEN '✓ موجود' ELSE '✗ غير موجود' END::text
  FROM platform_staff WHERE role = 'general_manager';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- المرحلة 4: تعليقات النسخ الاحتياطي
-- ==========================================

COMMENT ON TABLE backup_b2f_investor_accounts_20260106 
  IS 'B2F Production Launch Backup - 2026-01-06 - Test investors data';

COMMENT ON TABLE backup_b2f_sales_requests_20260106 
  IS 'B2F Production Launch Backup - 2026-01-06 - Test sales requests';

COMMENT ON TABLE backup_b2f_contracts_20260106 
  IS 'B2F Production Launch Backup - 2026-01-06 - Test contracts';

COMMENT ON TABLE backup_decision_queue_20260106 
  IS 'B2F Production Launch Backup - 2026-01-06 - Test decision queue';
