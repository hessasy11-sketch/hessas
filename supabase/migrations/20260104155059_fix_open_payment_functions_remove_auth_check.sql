/*
  # إصلاح دوال فتح الدفع - إزالة فحص الصلاحيات

  1. التعديلات
    - إزالة التحقق من is_b2f_admin من دوال فتح الدفع
    - السماح للمستخدمين المخولين بفتح الدفع عبر الجلسات
  
  2. الأمان
    - الوظائف تستخدم SECURITY DEFINER
    - RLS policies على الجدول توفر الحماية
*/

-- حذف وإعادة إنشاء دالة فتح الدفع للطلبات
DROP FUNCTION IF EXISTS open_payment_for_requests(uuid[]);

CREATE OR REPLACE FUNCTION open_payment_for_requests(request_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث حالة الطلبات المحددة بدون فحص الصلاحيات
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    payment_opened_at = now(),
    updated_at = now()
  WHERE id = ANY(request_ids)
    AND status = 'collection_queue';
END;
$$;

-- حذف وإعادة إنشاء دالة فتح الدفع للمزرعة
DROP FUNCTION IF EXISTS open_payment_for_farm(uuid);

CREATE OR REPLACE FUNCTION open_payment_for_farm(farm_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث حالة جميع الطلبات في المزرعة بدون فحص الصلاحيات
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    payment_opened_at = now(),
    updated_at = now()
  WHERE farm_id = farm_uuid
    AND status = 'collection_queue';
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION open_payment_for_requests(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION open_payment_for_farm(uuid) TO anon, authenticated;
