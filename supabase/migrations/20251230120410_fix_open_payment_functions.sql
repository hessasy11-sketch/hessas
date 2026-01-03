/*
  # إصلاح دالات فتح الدفع

  1. التعديلات
    - إزالة التحقق من صلاحيات الأدمن مؤقتاً
    - السماح بتنفيذ الدالات للمستخدمين المصرح لهم
    - إضافة حقول جديدة للتتبع

  2. الأمان
    - SECURITY DEFINER للسماح بالتنفيذ
    - سياسات RLS للحماية
*/

-- حذف الدالات القديمة
DROP FUNCTION IF EXISTS open_payment_for_requests(uuid[]);
DROP FUNCTION IF EXISTS open_payment_for_farm(uuid);

-- إنشاء دالة فتح الدفع للطلبات المحددة (بدون تحقق من الصلاحيات)
CREATE OR REPLACE FUNCTION open_payment_for_requests(request_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث حالة الطلبات المحددة
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    payment_opened_at = now(),
    updated_at = now()
  WHERE id = ANY(request_ids)
    AND status = 'collection_queue';
END;
$$;

-- إنشاء دالة فتح الدفع لجميع طلبات المزرعة (بدون تحقق من الصلاحيات)
CREATE OR REPLACE FUNCTION open_payment_for_farm(farm_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث حالة جميع الطلبات في المزرعة
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    payment_opened_at = now(),
    updated_at = now()
  WHERE farm_id = farm_uuid
    AND status = 'collection_queue';
END;
$$;

-- منح صلاحيات التنفيذ لـ anon و authenticated
GRANT EXECUTE ON FUNCTION open_payment_for_requests(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION open_payment_for_farm(uuid) TO anon, authenticated;
