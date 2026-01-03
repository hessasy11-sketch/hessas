/*
  # توحيد حالات الحجز - نظام واضح ونظيف

  1. Changes
    - توحيد جميع الحالات في b2f_sales_requests
    - حالات واضحة وموحدة
    - دعم المسار الجديد لرفع الإيصال

  2. Status Flow
    - pending → قيد المراجعة الأولية
    - collection_queue → في قائمة انتظار المجموعة
    - payment_open → مفتوح للدفع (بانتظار رفع الإيصال)
    - receipt_uploaded → تم رفع الإيصال (قيد المراجعة)
    - receipt_approved → تم قبول الإيصال (الدفع مؤكد)
    - receipt_rejected → تم رفض الإيصال (يحتاج إعادة رفع)
    - transferred_to_operations → تم نقله للتشغيل
*/

-- تحديث constraint الحالات لتشمل جميع الحالات الموحدة
ALTER TABLE b2f_sales_requests 
DROP CONSTRAINT IF EXISTS b2f_sales_requests_status_check;

ALTER TABLE b2f_sales_requests
ADD CONSTRAINT b2f_sales_requests_status_check
CHECK (status IN (
  'pending',
  'collection_queue',
  'payment_open',
  'receipt_uploaded',
  'receipt_under_review',
  'receipt_approved',
  'receipt_rejected',
  'receipt_needs_revision',
  'transferred_to_operations',
  'cancelled'
));

-- إنشاء دالة مساعدة للحصول على نص الحالة بالعربي
CREATE OR REPLACE FUNCTION get_booking_status_label(status_value text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE status_value
    WHEN 'pending' THEN 'قيد المراجعة'
    WHEN 'collection_queue' THEN 'في قائمة انتظار المجموعة'
    WHEN 'payment_open' THEN 'بانتظار رفع الإيصال'
    WHEN 'receipt_uploaded' THEN 'تم رفع الإيصال - قيد المراجعة'
    WHEN 'receipt_under_review' THEN 'الإيصال قيد المراجعة'
    WHEN 'receipt_approved' THEN 'تم تأكيد السداد'
    WHEN 'receipt_rejected' THEN 'الإيصال مرفوض - يرجى إعادة الرفع'
    WHEN 'receipt_needs_revision' THEN 'الإيصال يحتاج تعديل'
    WHEN 'transferred_to_operations' THEN 'تم نقله للتشغيل'
    WHEN 'cancelled' THEN 'ملغي'
    ELSE 'غير معروف'
  END;
END;
$$;

COMMENT ON FUNCTION get_booking_status_label IS 'إرجاع نص الحالة بالعربي';

-- إنشاء view لعرض الحجوزات مع الحالة بالعربي
CREATE OR REPLACE VIEW investor_bookings_view AS
SELECT 
  sr.*,
  get_booking_status_label(sr.status) as status_label,
  o.title as opportunity_title,
  f.name as farm_name,
  f.location as farm_location
FROM b2f_sales_requests sr
LEFT JOIN b2f_opportunities o ON o.id = sr.opportunity_id
LEFT JOIN b2f_farms f ON f.id = sr.farm_id;

COMMENT ON VIEW investor_bookings_view IS 'عرض الحجوزات مع تفاصيلها بالعربي';
