/*
  # تصفير نظام استثمار المزارع للإطلاق الفعلي
  
  1. نظرة عامة
    - حذف جميع البيانات التجريبية من نظام B2F
    - تصفير المزارع والمستثمرين والطلبات
    - إزالة جميع العقود والشهادات التجريبية
    - مسح الإشعارات القديمة
    - الحفاظ على الإعدادات والجداول المرجعية
    
  2. الجداول المتأثرة
    - b2f_contracts (العقود)
    - b2f_sales_requests (طلبات الاستثمار)
    - b2f_investor_accounts (حسابات المستثمرين)
    - b2f_opportunities (الفرص الاستثمارية)
    - b2f_farms (المزارع)
    - farm_team (فرق المزارع)
    - b2f_notifications (إشعارات B2F)
    - b2f_guest_notifications (إشعارات ضيوف B2F)
    
  3. ملاحظات الأمان
    - سيتم حذف جميع البيانات التجريبية بشكل نهائي
    - لن يؤثر على إعدادات النظام والصلاحيات
    - النظام جاهز لاستقبال بيانات فعلية جديدة
*/

-- حذف العقود أولاً (قد تعتمد على طلبات الاستثمار)
DELETE FROM b2f_contracts;

-- حذف طلبات الاستثمار
DELETE FROM b2f_sales_requests;

-- حذف حسابات المستثمرين
DELETE FROM b2f_investor_accounts;

-- حذف الفرص الاستثمارية
DELETE FROM b2f_opportunities;

-- حذف فرق المزارع
DELETE FROM farm_team;

-- حذف المزارع
DELETE FROM b2f_farms;

-- حذف إشعارات B2F
DELETE FROM b2f_notifications;

-- حذف إشعارات ضيوف B2F
DELETE FROM b2f_guest_notifications;

-- رسالة تأكيد
DO $$
DECLARE
  farms_count INT;
  opportunities_count INT;
  investors_count INT;
  requests_count INT;
  contracts_count INT;
BEGIN
  -- التحقق من التصفير
  SELECT COUNT(*) INTO farms_count FROM b2f_farms;
  SELECT COUNT(*) INTO opportunities_count FROM b2f_opportunities;
  SELECT COUNT(*) INTO investors_count FROM b2f_investor_accounts;
  SELECT COUNT(*) INTO requests_count FROM b2f_sales_requests;
  SELECT COUNT(*) INTO contracts_count FROM b2f_contracts;
  
  RAISE NOTICE '✓ تم تصفير نظام استثمار المزارع بنجاح';
  RAISE NOTICE '✓ المزارع: % | الفرص: % | المستثمرين: % | الطلبات: % | العقود: %', 
    farms_count, opportunities_count, investors_count, requests_count, contracts_count;
  RAISE NOTICE '✓ النظام جاهز للإطلاق الفعلي والبدء باستقبال بيانات حقيقية';
END $$;
