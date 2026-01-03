/*
  # إضافة حقل finance_status لنظام العقود
  
  1. التغييرات
    - إضافة حقل `finance_status` لجدول `b2f_sales_requests`
      - القيم المسموحة: 'pending_review', 'approved_for_contract', 'rejected'
      - القيمة الافتراضية: 'pending_review'
    
  2. الهدف
    - تمكين قسم المالية من اعتماد الطلبات لإصدار العقود
*/

-- إضافة حقل finance_status
ALTER TABLE b2f_sales_requests
ADD COLUMN IF NOT EXISTS finance_status TEXT DEFAULT 'pending_review'
CHECK (finance_status IN ('pending_review', 'approved_for_contract', 'rejected'));

-- تحديث السجلات الموجودة
UPDATE b2f_sales_requests
SET finance_status = CASE
  WHEN payment_status = 'payment_approved' AND ready_for_contract = true THEN 'approved_for_contract'
  WHEN payment_status = 'payment_approved' THEN 'pending_review'
  ELSE 'pending_review'
END
WHERE finance_status = 'pending_review';

-- إنشاء index للأداء
CREATE INDEX IF NOT EXISTS idx_b2f_sales_requests_finance_status 
ON b2f_sales_requests(finance_status);

COMMENT ON COLUMN b2f_sales_requests.finance_status IS 'حالة المراجعة المالية للطلب';
