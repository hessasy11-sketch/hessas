/*
  # تنظيف الدوال القديمة قبل إعادة الإنشاء
*/

DROP FUNCTION IF EXISTS manually_approve_receipt(UUID);
DROP FUNCTION IF EXISTS auto_issue_contract_on_approval(UUID);
DROP FUNCTION IF EXISTS get_investor_workflow_status(TEXT);
DROP FUNCTION IF EXISTS open_payment_for_requests(UUID[]);
DROP FUNCTION IF EXISTS open_payment_for_farm(UUID);
DROP FUNCTION IF EXISTS validate_workflow_transition() CASCADE;
DROP FUNCTION IF EXISTS validate_receipt_upload() CASCADE;
