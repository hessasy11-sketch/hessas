/*
  # إزالة نظام حسابات المستثمرين وصفحة التفاصيل - إصدار كامل

  1. الجداول المحذوفة:
    - `b2f_investor_accounts` - حسابات المستثمرين
    - `b2f_investment_requests` - طلبات الاستثمار
    - `b2f_certificates` - الشهادات الاستثمارية
    - `b2f_operation_fees` - رسوم التشغيل
    - `b2f_video_rules` - قواعد الفيديوهات
    - `b2f_video_bundles` - حزم الفيديوهات
    - `b2f_video_library` - مكتبة الفيديوهات
    - `b2f_visit_requests` - طلبات الزيارة
    - `b2f_maintenance_requests` - طلبات الصيانة
    - `b2f_contracts` - العقود
    - `b2f_sidebar_texts` - نصوص الشريط الجانبي
    - `b2f_profile_completion_texts` - نصوص استكمال البيانات
    - `investment_reservations` - الحجوزات المؤقتة

  2. الدوال والـ Triggers المحذوفة:
    - حذف جميع الـ triggers أولاً
    - ثم حذف الدوال
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS auto_sync_b2f_opportunity_status_trigger ON b2f_opportunities;

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS b2f_maintenance_requests CASCADE;
DROP TABLE IF EXISTS b2f_visit_requests CASCADE;
DROP TABLE IF EXISTS b2f_video_library CASCADE;
DROP TABLE IF EXISTS b2f_video_bundles CASCADE;
DROP TABLE IF EXISTS b2f_video_rules CASCADE;
DROP TABLE IF EXISTS b2f_operation_fees CASCADE;
DROP TABLE IF EXISTS b2f_certificates CASCADE;
DROP TABLE IF EXISTS b2f_contracts CASCADE;
DROP TABLE IF EXISTS b2f_investment_requests CASCADE;
DROP TABLE IF EXISTS investment_reservations CASCADE;
DROP TABLE IF EXISTS b2f_sidebar_texts CASCADE;
DROP TABLE IF EXISTS b2f_profile_completion_texts CASCADE;
DROP TABLE IF EXISTS b2f_investor_accounts CASCADE;

-- Drop related functions (with CASCADE to handle any remaining dependencies)
DROP FUNCTION IF EXISTS get_b2f_opportunity_reserved_trees(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_b2f_opportunity_remaining_trees(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_b2f_opportunity_statistics(uuid) CASCADE;
DROP FUNCTION IF EXISTS duplicate_b2f_opportunity(uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_sync_b2f_opportunity_status() CASCADE;

-- Clean up storage buckets
DO $$
BEGIN
  -- Delete all objects from b2f-payment-receipts bucket
  DELETE FROM storage.objects WHERE bucket_id = 'b2f-payment-receipts';
  -- Delete the bucket
  DELETE FROM storage.buckets WHERE id = 'b2f-payment-receipts';
  
  -- Delete all objects from b2f-opportunity-images bucket
  DELETE FROM storage.objects WHERE bucket_id = 'b2f-opportunity-images';
  -- Delete the bucket
  DELETE FROM storage.buckets WHERE id = 'b2f-opportunity-images';
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if buckets don't exist
    NULL;
END $$;
