/*
  # حذف نظام بوابات الدفع بالكامل
  
  ## الإجراءات
  1. حذف جميع الدوال المتعلقة ببوابات الدفع
  2. حذف جدول سجل التغييرات
  3. حذف جدول البوابات الرئيسي
  4. حذف الملفات المخزنة
  5. حذف buckets التخزين
*/

-- 1. حذف الدوال RPC
DROP FUNCTION IF EXISTS get_payment_gateways_summary() CASCADE;
DROP FUNCTION IF EXISTS toggle_gateway_status(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS test_gateway_connection(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_gateway_config(uuid, jsonb, text) CASCADE;

-- 2. حذف دالة التسجيل
DROP FUNCTION IF EXISTS log_gateway_change() CASCADE;

-- 3. حذف جدول سجل التغييرات
DROP TABLE IF EXISTS b2f_gateway_change_log CASCADE;

-- 4. حذف جدول البوابات الرئيسي
DROP TABLE IF EXISTS b2f_payment_gateways CASCADE;

-- 5. حذف الملفات المخزنة في buckets
DELETE FROM storage.objects WHERE bucket_id = 'b2f-payment-receipts';
DELETE FROM storage.objects WHERE bucket_id = 'payment-receipts';

-- 6. حذف buckets التخزين
DELETE FROM storage.buckets WHERE id = 'b2f-payment-receipts';
DELETE FROM storage.buckets WHERE id = 'payment-receipts';

-- تنظيف مكتمل
