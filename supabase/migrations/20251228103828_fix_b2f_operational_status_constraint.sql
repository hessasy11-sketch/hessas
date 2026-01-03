/*
  # إصلاح constraint الحالة التشغيلية
  
  حذف constraint القديم وإضافة واحد جديد يدعم جميع الحالات
*/

-- حذف constraint القديم للحالة التشغيلية
ALTER TABLE b2f_investment_requests
DROP CONSTRAINT IF EXISTS b2f_investment_requests_operational_status_check;

-- إضافة constraint جديد يدعم جميع الحالات
ALTER TABLE b2f_investment_requests
ADD CONSTRAINT b2f_investment_requests_operational_status_check
CHECK (operational_status IN (
  'not_started',
  'preparation',
  'planting',
  'monitoring',
  'completed',
  'cancelled',
  'on_hold',
  'pending',
  'in_progress'
));
