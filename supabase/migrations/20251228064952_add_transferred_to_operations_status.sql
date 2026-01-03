/*
  # إضافة حالة التحويل للتشغيل

  1. التغييرات
    - إضافة حالة 'transferred_to_operations' إلى جدول investment_reservations
    - تحديث قيود الحالة لتشمل الحالة الجديدة
  
  2. الوصف
    - الحالة الجديدة تُستخدم عندما يتم تحويل العقد من مرحلة "جاهز للتشغيل" إلى مرحلة "التشغيل الفعلي"
    - تمثل آخر مرحلة في دورة الطلب الاستثماري قبل دخول مرحلة التشغيل والصيانة
*/

-- تحديث قيود الحالة في جدول investment_reservations
DO $$ 
BEGIN
  -- التحقق من وجود القيد وحذفه
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investment_reservations_status_check'
  ) THEN
    ALTER TABLE investment_reservations 
    DROP CONSTRAINT investment_reservations_status_check;
  END IF;

  -- إضافة القيد الجديد مع الحالة الجديدة
  ALTER TABLE investment_reservations
  ADD CONSTRAINT investment_reservations_status_check
  CHECK (status IN (
    'pending',
    'approved_pending_payment',
    'payment_submitted',
    'awaiting_contract',
    'contract_issued',
    'transferred_to_operations',
    'cancelled'
  ));
END $$;

-- إنشاء فهرس لتحسين الأداء عند البحث عن العقود الجاهزة للتحويل
CREATE INDEX IF NOT EXISTS idx_investment_reservations_contract_issued 
ON investment_reservations(status) 
WHERE status = 'contract_issued';

-- إنشاء فهرس للعقود المحولة
CREATE INDEX IF NOT EXISTS idx_investment_reservations_transferred 
ON investment_reservations(status) 
WHERE status = 'transferred_to_operations';

-- إضافة تعليق توضيحي
COMMENT ON COLUMN investment_reservations.status IS 
'حالة الطلب الاستثماري:
- pending: طلب جديد
- approved_pending_payment: تمت الموافقة، بانتظار السداد
- payment_submitted: تم رفع إيصال السداد
- awaiting_contract: بانتظار إصدار العقد
- contract_issued: عقد صادر - جاهز للتحويل للتشغيل
- transferred_to_operations: محوّل إلى التشغيل
- cancelled: ملغي';
