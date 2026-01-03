/*
  # إضافة حالة "موافق - بانتظار السداد"

  1. التغييرات
    - إضافة حالة جديدة: `approved_pending_payment` لجدول `investment_reservations`
    - هذه الحالة تعني أن الحجز تمت الموافقة عليه وينتظر رفع إيصال السداد

  2. الحالات المتاحة بعد التحديث
    - `new` - جديد
    - `pending` - قيد المراجعة
    - `approved` - موافق عليه
    - `approved_pending_payment` - موافق - بانتظار السداد ← جديد
    - `confirmed` - مؤكد
    - `completed` - مكتمل
    - `cancelled` - ملغي
    - `issue` - مشكلة

  3. الأمان
    - تحديث القيود (constraints) بشكل آمن
    - لا يؤثر على البيانات الحالية
*/

-- حذف القيد القديم إذا كان موجوداً
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'investment_reservations_status_check'
      AND table_name = 'investment_reservations'
  ) THEN
    ALTER TABLE investment_reservations
    DROP CONSTRAINT investment_reservations_status_check;
  END IF;
END $$;

-- إضافة القيد الجديد مع الحالة الإضافية
ALTER TABLE investment_reservations
ADD CONSTRAINT investment_reservations_status_check
CHECK (status IN (
  'new',
  'pending',
  'approved',
  'approved_pending_payment',
  'confirmed',
  'completed',
  'cancelled',
  'issue'
));

-- إضافة تعليق توضيحي
COMMENT ON COLUMN investment_reservations.status IS
'حالة الحجز: new (جديد), pending (قيد المراجعة), approved (موافق عليه), approved_pending_payment (موافق - بانتظار السداد), confirmed (مؤكد), completed (مكتمل), cancelled (ملغي), issue (مشكلة)';
