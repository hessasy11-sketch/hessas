/*
  # إصلاح قيد operational_status وإضافة حقل رسوم التشغيل

  1. التغييرات
    - إزالة القيد القديم أولاً
    - تحديث جميع القيم الموجودة
    - إضافة القيد الجديد
    - إضافة حقل operation_fees_paid

  2. الحالات الجديدة (4 فقط)
    - ready: 🟢 جاهز
    - in_progress: 🟡 تحت الإجراء
    - awaiting_investor: 🔵 بانتظار قرار من المستثمر
    - needs_admin: 🔴 يحتاج تدخل الإدارة
*/

-- الخطوة 1: إزالة القيد القديم أولاً
ALTER TABLE investment_reservations
DROP CONSTRAINT IF EXISTS investment_reservations_operational_status_check;

-- الخطوة 2: تحديث جميع القيم الموجودة من النظام القديم إلى الجديد
UPDATE investment_reservations
SET operational_status =
  CASE
    WHEN operational_status IN ('completed', 'harvesting') THEN 'ready'
    WHEN operational_status IN ('planting', 'monitoring', 'maintenance') THEN 'in_progress'
    WHEN operational_status IN ('not_started', 'preparation') THEN 'in_progress'
    WHEN operational_status IN ('on_hold', 'cancelled') THEN 'needs_admin'
    ELSE 'in_progress'
  END
WHERE operational_status IS NOT NULL;

-- الخطوة 3: إضافة القيد الجديد مع الحالات الأربع فقط
ALTER TABLE investment_reservations
ADD CONSTRAINT investment_reservations_operational_status_check
CHECK (
  operational_status IS NULL OR
  operational_status IN ('ready', 'in_progress', 'awaiting_investor', 'needs_admin')
);

-- الخطوة 4: إضافة حقل رسوم التشغيل
ALTER TABLE investment_reservations
ADD COLUMN IF NOT EXISTS operation_fees_paid boolean DEFAULT false;

-- الخطوة 5: تحديث القيم الموجودة حسب الحالة
UPDATE investment_reservations
SET operation_fees_paid = true
WHERE status IN ('contract_issued', 'active', 'operational');

-- الخطوة 6: إنشاء index للأداء
CREATE INDEX IF NOT EXISTS idx_reservations_operation_fees
  ON investment_reservations(operation_fees_paid);

-- تعليقات على الحقول
COMMENT ON COLUMN investment_reservations.operation_fees_paid IS
'هل تم دفع رسوم التشغيل السنوية للسنة الأولى';

COMMENT ON COLUMN investment_reservations.operational_status IS
'حالة التشغيل: ready (جاهز), in_progress (تحت الإجراء), awaiting_investor (بانتظار المستثمر), needs_admin (يحتاج الإدارة)';
