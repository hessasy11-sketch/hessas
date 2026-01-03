/*
  # حذف الجداول المتبقية من نظام طلبات الاستثمار

  ## الحذف
  
  1. حذف الجداول المتبقية
     - `certificate_issuance_log` - سجل إصدار الشهادات
     - `investment_opportunity_cards` - بطاقات الفرص الاستثمارية
     - `operational_timeline` - الجدول الزمني للتشغيل
  
  ## ملاحظات
  - استخدام CASCADE لحذف جميع العلاقات المرتبطة
  - حذف نهائي لا يمكن التراجع عنه
*/

-- حذف الجداول المتبقية
DROP TABLE IF EXISTS certificate_issuance_log CASCADE;
DROP TABLE IF EXISTS investment_opportunity_cards CASCADE;
DROP TABLE IF EXISTS operational_timeline CASCADE;

-- تأكيد: لا يوجد أي جداول متعلقة بنظام طلبات الاستثمار
