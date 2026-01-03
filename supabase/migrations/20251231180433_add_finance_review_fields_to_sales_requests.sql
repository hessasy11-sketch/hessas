/*
  # إضافة حقول المراجعة المالية

  1. التغييرات
    - إضافة finance_reviewed (boolean)
    - إضافة finance_reviewed_at (timestamptz)
    
  2. الهدف
    - تتبع مراجعة المالية للإيصالات
*/

-- إضافة الحقول الجديدة
ALTER TABLE b2f_sales_requests
ADD COLUMN IF NOT EXISTS finance_reviewed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finance_reviewed_at TIMESTAMPTZ;

-- تعليق
COMMENT ON COLUMN b2f_sales_requests.finance_reviewed IS 'هل تمت مراجعة الإيصال من قبل المالية';
COMMENT ON COLUMN b2f_sales_requests.finance_reviewed_at IS 'تاريخ مراجعة المالية للإيصال';
