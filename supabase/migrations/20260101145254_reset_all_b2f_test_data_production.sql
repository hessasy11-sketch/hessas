/*
  # تصفير جميع البيانات التجريبية - جاهز للإنتاج
  
  ## البيانات التي تم حذفها
  - 11 حساب مستثمر تجريبي
  - جميع الطلبات والمبيعات
  - جميع الإيصالات والمستندات المالية
  - جميع العقود والشهادات
  - جميع العمليات والمواسم التشغيلية
  - جميع الإشعارات والمحادثات
  - جميع سجلات التدقيق والعمليات
  
  ## البنية المحفوظة
  - جميع الجداول والـ Views والـ Functions
  - المزارع (b2f_farms)
  - الفرص الاستثمارية (b2f_opportunities)
  - الإعدادات (b2f_settings)
  - تكوينات بوابات الدفع (b2f_payment_gateways_config)
  - مستخدمي الإدارة (b2f_admin_users)
  - قاعدة معرفة الذكاء الصناعي (b2f_ai_knowledge_base)
  - رسائل النظام (b2f_system_messages)
  - أنواع الخدمات (b2f_service_types)
  - معلومات الحسابات البنكية (b2f_bank_account_info)
*/

-- ===================================================================
-- حذف طلبات الخدمة والإشعارات
-- ===================================================================

TRUNCATE TABLE b2f_service_request_logs CASCADE;
TRUNCATE TABLE b2f_investor_service_requests CASCADE;
TRUNCATE TABLE b2f_notifications CASCADE;
TRUNCATE TABLE b2f_guest_notifications CASCADE;

-- ===================================================================
-- حذف محادثات الذكاء الصناعي
-- ===================================================================

TRUNCATE TABLE b2f_ai_messages CASCADE;
TRUNCATE TABLE b2f_ai_conversations CASCADE;
TRUNCATE TABLE b2f_ai_analytics CASCADE;
TRUNCATE TABLE b2f_ai_feedback CASCADE;
TRUNCATE TABLE b2f_ai_learning_log CASCADE;
TRUNCATE TABLE b2f_ai_system_notifications CASCADE;

-- ===================================================================
-- حذف العمليات التشغيلية
-- ===================================================================

TRUNCATE TABLE b2f_operation_timeline CASCADE;
TRUNCATE TABLE b2f_operational_timeline CASCADE;
TRUNCATE TABLE b2f_operation_updates CASCADE;
TRUNCATE TABLE b2f_operation_reviews CASCADE;
TRUNCATE TABLE b2f_operation_maintenance CASCADE;
TRUNCATE TABLE b2f_operation_logs CASCADE;
TRUNCATE TABLE b2f_phase_tasks CASCADE;
TRUNCATE TABLE b2f_operation_phases CASCADE;
TRUNCATE TABLE b2f_tree_operations CASCADE;
TRUNCATE TABLE b2f_harvest_records CASCADE;
TRUNCATE TABLE b2f_operations_orders CASCADE;
TRUNCATE TABLE b2f_operations CASCADE;
TRUNCATE TABLE b2f_operation_cards CASCADE;

-- ===================================================================
-- حذف المواسم
-- ===================================================================

TRUNCATE TABLE b2f_season_reports CASCADE;
TRUNCATE TABLE b2f_season_files CASCADE;
TRUNCATE TABLE b2f_season_costs CASCADE;
TRUNCATE TABLE b2f_season_phases CASCADE;
TRUNCATE TABLE b2f_farm_seasons CASCADE;

-- ===================================================================
-- حذف العقود والشهادات
-- ===================================================================

TRUNCATE TABLE b2f_certificates CASCADE;
TRUNCATE TABLE b2f_contracts CASCADE;

-- ===================================================================
-- حذف المستندات المالية
-- ===================================================================

TRUNCATE TABLE b2f_payment_gateway_logs CASCADE;
TRUNCATE TABLE b2f_payment_documents CASCADE;
TRUNCATE TABLE b2f_financial_operations_log CASCADE;
TRUNCATE TABLE b2f_status_audit_log CASCADE;

-- ===================================================================
-- حذف طلبات المبيعات
-- ===================================================================

TRUNCATE TABLE b2f_request_timeline CASCADE;
TRUNCATE TABLE b2f_sales_requests CASCADE;

-- ===================================================================
-- حذف حسابات المستثمرين (11 حساب)
-- ===================================================================

TRUNCATE TABLE b2f_investor_accounts CASCADE;

-- ===================================================================
-- إعادة تعيين المحافظ المالية
-- ===================================================================

-- إعادة تعيين محافظ الأقسام
UPDATE b2f_section_wallet
SET
  total_collected_amount = 0,
  total_pending_amount = 0,
  updated_at = NOW()
WHERE TRUE;

-- إعادة تعيين محافظ المزارع
UPDATE b2f_farm_wallets
SET
  collected_amount = 0,
  pending_amount = 0,
  updated_at = NOW()
WHERE TRUE;
