/*
  دليل التحقق السريع من نظافة نظام B2F
  ========================================

  استخدم هذه الأوامر للتحقق الفوري من نظافة النظام
*/

-- ==========================================
-- 1. التحقق الشامل السريع
-- ==========================================

SELECT
  '🎯 نظافة البيانات التجريبية' as category,
  'المزارع' as item,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ نظيف' ELSE '❌ يحتاج تنظيف' END as status
FROM b2f_farms

UNION ALL

SELECT
  '🎯 نظافة البيانات التجريبية',
  'العروض الاستثمارية',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ نظيف' ELSE '❌ يحتاج تنظيف' END
FROM b2f_opportunities

UNION ALL

SELECT
  '🎯 نظافة البيانات التجريبية',
  'المستثمرين',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ نظيف' ELSE '❌ يحتاج تنظيف' END
FROM b2f_investor_accounts

UNION ALL

SELECT
  '🎯 نظافة البيانات التجريبية',
  'الطلبات',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ نظيف' ELSE '❌ يحتاج تنظيف' END
FROM b2f_sales_requests

UNION ALL

SELECT
  '🎯 نظافة البيانات التجريبية',
  'العقود',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ نظيف' ELSE '❌ يحتاج تنظيف' END
FROM b2f_contracts

UNION ALL

SELECT
  '🎯 نظافة البيانات التجريبية',
  'العمليات التشغيلية',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ نظيف' ELSE '❌ يحتاج تنظيف' END
FROM b2f_farm_operations

UNION ALL

SELECT
  '👥 الموظفون',
  'عدد الموظفين',
  COUNT(*),
  CASE WHEN COUNT(*) = 1 THEN '✅ مدير عام واحد فقط' ELSE '⚠️ ' || COUNT(*) || ' موظفين' END
FROM platform_staff

UNION ALL

SELECT
  '📊 الإعدادات',
  'بوابات الدفع',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ مُعدة' ELSE '⚠️ غير مُعدة' END
FROM b2f_payment_gateways_config;

-- ==========================================
-- 2. التحقق من الدالة الآلية
-- ==========================================

-- استخدم هذه الدالة للتحقق السريع
SELECT * FROM verify_complete_cleanup();

-- ==========================================
-- 3. التحقق من المدير العام
-- ==========================================

SELECT
  id,
  full_name,
  role,
  department,
  qr_code,
  is_active,
  created_at
FROM platform_staff
ORDER BY created_at DESC;

-- النتيجة المتوقعة: موظف واحد فقط (المدير العام)

-- ==========================================
-- 4. التحقق من النسخ الاحتياطية
-- ==========================================

SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_name LIKE 'backup_%20260106%'
ORDER BY table_name;

-- ==========================================
-- 5. عد إجمالي السجلات المهمة
-- ==========================================

SELECT
  (SELECT COUNT(*) FROM b2f_farms) as farms,
  (SELECT COUNT(*) FROM b2f_opportunities) as opportunities,
  (SELECT COUNT(*) FROM b2f_investor_accounts) as investors,
  (SELECT COUNT(*) FROM b2f_sales_requests) as requests,
  (SELECT COUNT(*) FROM b2f_contracts) as contracts,
  (SELECT COUNT(*) FROM platform_staff) as staff;

-- النتيجة المتوقعة:
-- farms: 0
-- opportunities: 0
-- investors: 0
-- requests: 0
-- contracts: 0
-- staff: 1

-- ==========================================
-- 6. التحقق من جاهزية الإطلاق
-- ==========================================

DO $$
DECLARE
  farms_count int;
  opportunities_count int;
  investors_count int;
  staff_count int;
  is_ready boolean := true;
BEGIN
  SELECT COUNT(*) INTO farms_count FROM b2f_farms;
  SELECT COUNT(*) INTO opportunities_count FROM b2f_opportunities;
  SELECT COUNT(*) INTO investors_count FROM b2f_investor_accounts;
  SELECT COUNT(*) INTO staff_count FROM platform_staff;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '    تقرير جاهزية الإطلاق السريع';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';

  IF farms_count = 0 THEN
    RAISE NOTICE '✅ المزارع: نظيف (% سجل)', farms_count;
  ELSE
    RAISE NOTICE '❌ المزارع: % سجل موجود', farms_count;
    is_ready := false;
  END IF;

  IF opportunities_count = 0 THEN
    RAISE NOTICE '✅ العروض: نظيف (% سجل)', opportunities_count;
  ELSE
    RAISE NOTICE '❌ العروض: % سجل موجود', opportunities_count;
    is_ready := false;
  END IF;

  IF investors_count = 0 THEN
    RAISE NOTICE '✅ المستثمرين: نظيف (% سجل)', investors_count;
  ELSE
    RAISE NOTICE '❌ المستثمرين: % سجل موجود', investors_count;
    is_ready := false;
  END IF;

  IF staff_count = 1 THEN
    RAISE NOTICE '✅ الموظفون: مدير عام واحد (% موظف)', staff_count;
  ELSE
    RAISE NOTICE '⚠️  الموظفون: % موظفين', staff_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';

  IF is_ready THEN
    RAISE NOTICE '🚀 الحالة: جاهز للإطلاق الفوري!';
  ELSE
    RAISE NOTICE '⚠️  الحالة: يحتاج مراجعة';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- ==========================================
-- 7. استعلامات إضافية مفيدة
-- ==========================================

-- عرض جميع الجداول الفارغة المتوقع أن تكون فارغة
SELECT
  'b2f_farms' as table_name,
  (SELECT COUNT(*) FROM b2f_farms) as count,
  'should be 0' as expected
UNION ALL
SELECT 'b2f_opportunities', (SELECT COUNT(*) FROM b2f_opportunities), 'should be 0'
UNION ALL
SELECT 'b2f_investor_accounts', (SELECT COUNT(*) FROM b2f_investor_accounts), 'should be 0'
UNION ALL
SELECT 'b2f_sales_requests', (SELECT COUNT(*) FROM b2f_sales_requests), 'should be 0'
UNION ALL
SELECT 'b2f_contracts', (SELECT COUNT(*) FROM b2f_contracts), 'should be 0'
UNION ALL
SELECT 'b2f_farm_operations', (SELECT COUNT(*) FROM b2f_farm_operations), 'should be 0';

-- ==========================================
-- النتيجة المتوقعة للنظام النظيف:
-- ==========================================
/*
جميع جداول B2F يجب أن تكون فارغة (0 سجل):
✅ b2f_farms: 0
✅ b2f_opportunities: 0
✅ b2f_investor_accounts: 0
✅ b2f_sales_requests: 0
✅ b2f_contracts: 0
✅ b2f_farm_operations: 0

موظف واحد فقط:
✅ platform_staff: 1 (المدير العام)

الإعدادات موجودة:
✅ b2f_payment_gateways_config: > 0
✅ b2f_system_messages: > 0

إذا كانت جميع النتائج مطابقة، النظام نظيف 100% وجاهز للإطلاق! 🚀
*/
