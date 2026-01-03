/*
  # حذف نظام طلبات الاستثمار والمجموعات بالكامل

  ## التغييرات:
  
  ### 1. حذف جميع الـ triggers
  ### 2. حذف جميع الدوال
  ### 3. حذف جميع الجداول المرتبطة
  
  هذا الحذف نهائي ولا يمكن التراجع عنه.
*/

-- 1. حذف جميع الـ triggers المرتبطة
DROP TRIGGER IF EXISTS trigger_auto_collection_queue ON b2f_investment_requests;
DROP TRIGGER IF EXISTS trigger_receipt_uploaded ON b2f_investment_requests;
DROP TRIGGER IF EXISTS trigger_auto_season_assignment ON b2f_investment_requests;
DROP TRIGGER IF EXISTS trigger_ai_receipt_verification ON b2f_investment_requests;

-- 2. حذف جميع الدوال المرتبطة
DROP FUNCTION IF EXISTS auto_move_to_collection_queue() CASCADE;
DROP FUNCTION IF EXISTS on_receipt_uploaded() CASCADE;
DROP FUNCTION IF EXISTS open_payment_for_batch(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS review_payment_receipt(uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS issue_contracts_for_approved(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS get_farm_requests_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_assign_season_on_payment() CASCADE;
DROP FUNCTION IF EXISTS trigger_ai_receipt_analysis() CASCADE;

-- 3. حذف جدول طلبات الاستثمار
DROP TABLE IF EXISTS b2f_investment_requests CASCADE;

-- 4. حذف جدول المجموعات
DROP TABLE IF EXISTS b2f_investment_groups CASCADE;

-- 5. حذف bucket الإيصالات إن وجد
DO $$
BEGIN
  -- حذف bucket للإيصالات
  DELETE FROM storage.buckets WHERE id = 'b2f-receipts';
EXCEPTION WHEN OTHERS THEN
  -- لا مشكلة إذا لم يكن موجوداً
  NULL;
END $$;