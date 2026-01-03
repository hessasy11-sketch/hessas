/*
  # حذف الدوال المتبقية من نظام طلبات الاستثمار

  ## الحذف
  - حذف جميع الدوال المتبقية المتعلقة بنظام طلبات الاستثمار
  - استخدام CASCADE لحذف أي علاقات
*/

-- حذف الدوال المتبقية
DROP FUNCTION IF EXISTS activate_contract_after_payment CASCADE;
DROP FUNCTION IF EXISTS approve_investment_request CASCADE;
DROP FUNCTION IF EXISTS calculate_contract_end_date CASCADE;
DROP FUNCTION IF EXISTS calculate_operation_total_fee CASCADE;

-- تأكيد: تم حذف جميع الدوال المتعلقة بنظام طلبات الاستثمار
