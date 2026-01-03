/*
  # إصلاح شامل لحالات Status في b2f_investment_requests
  
  إضافة جميع الحالات الناقصة لدعم المسار الكامل
*/

-- حذف constraint القديم
ALTER TABLE b2f_investment_requests
DROP CONSTRAINT IF EXISTS valid_status;

-- إضافة constraint جديد شامل
ALTER TABLE b2f_investment_requests
ADD CONSTRAINT valid_status CHECK (status IN (
  'new',
  'approved',
  'awaiting_payment',
  'payment_uploaded',
  'payment_verified',
  'approved_pending_payment',
  'awaiting_contract',
  'contract_issued',
  'contract_ready',
  'transferred_to_operations',
  'active',
  'contacted',
  'completed',
  'issue',
  'rejected',
  'cancelled',
  'confirmed'
));
