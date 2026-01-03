/*
  # حذف جميع الدوال القديمة المتعلقة بالعقود
  
  حذف كامل للنظام القديم
*/

-- حذف جميع نسخ الدوال القديمة
DROP FUNCTION IF EXISTS auto_issue_contract_on_approval CASCADE;
DROP FUNCTION IF EXISTS manually_approve_receipt_with_auto_contract CASCADE;
DROP FUNCTION IF EXISTS manually_approve_receipt CASCADE;
DROP FUNCTION IF EXISTS issue_contract_for_request CASCADE;
DROP FUNCTION IF EXISTS issue_multiple_contracts CASCADE;
