/*
  # إضافة عمود رابط الإيصال إلى جدول طلبات البيع

  1. Changes
    - إضافة عمود `payment_receipt_url` لحفظ رابط إيصال الدفع المرفوع
    - إضافة عمود `ai_verification_status` لحالة التحقق بالذكاء الصناعي
    - إضافة عمود `ai_verification_notes` لملاحظات الذكاء الصناعي
    - إضافة عمود `ai_verified_at` لتاريخ التحقق بالذكاء الصناعي

  2. Security
    - لا تغيير في سياسات RLS
*/

-- إضافة الأعمدة المطلوبة
ALTER TABLE b2f_sales_requests 
ADD COLUMN IF NOT EXISTS payment_receipt_url text,
ADD COLUMN IF NOT EXISTS ai_verification_status text CHECK (ai_verification_status IN ('pending', 'approved', 'rejected', 'needs_review')),
ADD COLUMN IF NOT EXISTS ai_verification_notes text,
ADD COLUMN IF NOT EXISTS ai_verified_at timestamptz;

-- إضافة تعليقات
COMMENT ON COLUMN b2f_sales_requests.payment_receipt_url IS 'رابط إيصال الدفع المرفوع في Storage';
COMMENT ON COLUMN b2f_sales_requests.ai_verification_status IS 'حالة التحقق التلقائي من الإيصال بالذكاء الصناعي';
COMMENT ON COLUMN b2f_sales_requests.ai_verification_notes IS 'ملاحظات الذكاء الصناعي حول الإيصال';
COMMENT ON COLUMN b2f_sales_requests.ai_verified_at IS 'تاريخ التحقق من الإيصال بالذكاء الصناعي';
