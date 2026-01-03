/*
  # تصفير النظام التجريبي للإنتاج
  
  حذف جميع البيانات التجريبية مع الحفاظ على البنية والإعدادات
*/

-- =============================================
-- 1. تصفير جداول التشغيل والعمليات
-- =============================================
TRUNCATE TABLE b2f_operations_orders CASCADE;
TRUNCATE TABLE b2f_operations CASCADE;
TRUNCATE TABLE b2f_operation_logs CASCADE;
TRUNCATE TABLE b2f_operation_cards CASCADE;
TRUNCATE TABLE b2f_operation_maintenance CASCADE;
TRUNCATE TABLE b2f_operation_phases CASCADE;
TRUNCATE TABLE b2f_operation_reviews CASCADE;
TRUNCATE TABLE b2f_operation_timeline CASCADE;
TRUNCATE TABLE b2f_operation_updates CASCADE;
TRUNCATE TABLE b2f_operational_timeline CASCADE;
TRUNCATE TABLE b2f_tree_operations CASCADE;
TRUNCATE TABLE b2f_phase_tasks CASCADE;
TRUNCATE TABLE b2f_harvest_records CASCADE;

-- =============================================
-- 2. تصفير جداول العقود والشهادات
-- =============================================
TRUNCATE TABLE b2f_certificates CASCADE;
TRUNCATE TABLE b2f_contracts CASCADE;

-- =============================================
-- 3. تصفير جداول المواسم
-- =============================================
TRUNCATE TABLE b2f_season_phases CASCADE;
TRUNCATE TABLE b2f_season_costs CASCADE;
TRUNCATE TABLE b2f_season_files CASCADE;
TRUNCATE TABLE b2f_season_reports CASCADE;
TRUNCATE TABLE b2f_farm_seasons CASCADE;

-- =============================================
-- 4. تصفير جداول الطلبات والمبيعات
-- =============================================
TRUNCATE TABLE b2f_request_timeline CASCADE;
TRUNCATE TABLE b2f_status_audit_log CASCADE;
TRUNCATE TABLE b2f_service_request_logs CASCADE;
TRUNCATE TABLE b2f_investor_service_requests CASCADE;
TRUNCATE TABLE b2f_payment_documents CASCADE;
TRUNCATE TABLE b2f_invoices CASCADE;
TRUNCATE TABLE b2f_sales_requests CASCADE;

-- =============================================
-- 5. تصفير جداول الإشعارات
-- =============================================
TRUNCATE TABLE b2f_notifications CASCADE;
TRUNCATE TABLE b2f_guest_notifications CASCADE;
TRUNCATE TABLE b2f_ai_system_notifications CASCADE;

-- =============================================
-- 6. تصفير جداول الذكاء الصناعي
-- =============================================
TRUNCATE TABLE b2f_ai_messages CASCADE;
TRUNCATE TABLE b2f_ai_conversations CASCADE;
TRUNCATE TABLE b2f_ai_feedback CASCADE;
TRUNCATE TABLE b2f_ai_learning_log CASCADE;
TRUNCATE TABLE b2f_ai_analytics CASCADE;

-- =============================================
-- 7. تصفير جداول التصنيفات
-- =============================================
TRUNCATE TABLE b2f_investor_classifications CASCADE;

-- =============================================
-- 8. تصفير محافظ المزارع
-- =============================================
TRUNCATE TABLE b2f_farm_wallets CASCADE;

-- تصفير محفظة القسم
UPDATE b2f_section_wallet SET 
  total_collected_amount = 0,
  total_pending_amount = 0,
  total_investors = 0,
  total_receipts = 0,
  total_contracts = 0,
  first_transaction_at = NULL,
  last_transaction_at = NULL,
  updated_at = NOW();

-- =============================================
-- 9. تصفير المحافظ العامة
-- =============================================
UPDATE wallets SET 
  balance = 0,
  total_earnings = 0,
  pending_commissions = 0,
  updated_at = NOW();

-- =============================================
-- 10. حذف حسابات المستثمرين التجريبية
-- =============================================
TRUNCATE TABLE b2f_investor_accounts CASCADE;

-- =============================================
-- التحقق النهائي
-- =============================================
DO $$
DECLARE
  v_sales INTEGER;
  v_contracts INTEGER;
  v_operations INTEGER;
  v_certificates INTEGER;
  v_investors INTEGER;
  v_farms INTEGER;
  v_opportunities INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sales FROM b2f_sales_requests;
  SELECT COUNT(*) INTO v_contracts FROM b2f_contracts;
  SELECT COUNT(*) INTO v_operations FROM b2f_operations_orders;
  SELECT COUNT(*) INTO v_certificates FROM b2f_certificates;
  SELECT COUNT(*) INTO v_investors FROM b2f_investor_accounts;
  SELECT COUNT(*) INTO v_farms FROM b2f_farms;
  SELECT COUNT(*) INTO v_opportunities FROM b2f_opportunities;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '   تم تصفير النظام بنجاح';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'طلبات المبيعات: %', v_sales;
  RAISE NOTICE 'العقود: %', v_contracts;
  RAISE NOTICE 'أوامر التشغيل: %', v_operations;
  RAISE NOTICE 'الشهادات: %', v_certificates;
  RAISE NOTICE 'حسابات المستثمرين: %', v_investors;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'المزارع (محفوظة): %', v_farms;
  RAISE NOTICE 'الفرص الاستثمارية (محفوظة): %', v_opportunities;
  RAISE NOTICE '========================================';
END $$;
