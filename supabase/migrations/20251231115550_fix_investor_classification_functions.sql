/*
  # إصلاح دوال التصنيف والمرحلة للمستثمر

  ## المشكلة:
  - دالة calculate_investor_total_trees لا تشمل جميع الحالات
  - دالة get_investor_current_stage تستخدم investor_account_id الذي قد يكون null

  ## الإصلاح:
  - تحديث حساب الأشجار ليشمل جميع الحالات المعتمدة
  - استخدام contact_phone للبحث بدلاً من account_id
*/

-- 1. تحديث دالة حساب إجمالي الأشجار
CREATE OR REPLACE FUNCTION calculate_investor_total_trees(account_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_phone text;
BEGIN
  -- جلب رقم هاتف المستثمر
  SELECT contact_phone INTO v_phone
  FROM b2f_investor_accounts
  WHERE id = account_uuid;

  IF v_phone IS NULL THEN
    RETURN 0;
  END IF;

  -- حساب مجموع الأشجار من جميع طلبات المبيعات المعتمدة
  SELECT COALESCE(SUM(number_of_trees), 0)
  INTO v_total
  FROM b2f_sales_requests
  WHERE investor_phone = v_phone
    AND status IN ('receipt_approved', 'contract_issued', 'transferred_to_operations');
  
  -- تحديث الإجمالي في جدول الحساب
  UPDATE b2f_investor_accounts
  SET total_trees = v_total,
      last_activity_date = now()
  WHERE id = account_uuid;
  
  RETURN v_total;
END;
$$;

-- 2. تحديث دالة المرحلة الحالية
CREATE OR REPLACE FUNCTION get_investor_current_stage(account_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phone text;
  v_has_operations boolean;
  v_has_contracts boolean;
  v_has_approved boolean;
  v_has_pending boolean;
BEGIN
  -- جلب رقم هاتف المستثمر
  SELECT contact_phone INTO v_phone
  FROM b2f_investor_accounts
  WHERE id = account_uuid;

  IF v_phone IS NULL THEN
    RETURN 'جديد';
  END IF;

  -- التحقق من وجود تشغيل فعلي
  SELECT EXISTS (
    SELECT 1 FROM b2f_sales_requests
    WHERE investor_phone = v_phone
      AND status = 'transferred_to_operations'
  ) INTO v_has_operations;
  
  IF v_has_operations THEN
    RETURN 'تشغيل';
  END IF;
  
  -- التحقق من وجود عقود
  SELECT EXISTS (
    SELECT 1 FROM b2f_sales_requests
    WHERE investor_phone = v_phone
      AND status = 'contract_issued'
  ) INTO v_has_contracts;
  
  IF v_has_contracts THEN
    RETURN 'عقد';
  END IF;
  
  -- التحقق من إيصالات معتمدة
  SELECT EXISTS (
    SELECT 1 FROM b2f_sales_requests
    WHERE investor_phone = v_phone
      AND status = 'receipt_approved'
  ) INTO v_has_approved;
  
  IF v_has_approved THEN
    RETURN 'دفع';
  END IF;
  
  -- التحقق من طلبات في الانتظار
  SELECT EXISTS (
    SELECT 1 FROM b2f_sales_requests
    WHERE investor_phone = v_phone
  ) INTO v_has_pending;
  
  IF v_has_pending THEN
    RETURN 'حجز';
  END IF;
  
  RETURN 'جديد';
END;
$$;

-- إضافة تعليقات توضيحية
COMMENT ON FUNCTION calculate_investor_total_trees IS 
'يحسب إجمالي الأشجار للمستثمر من الطلبات المعتمدة';

COMMENT ON FUNCTION get_investor_current_stage IS
'يحدد المرحلة التشغيلية الحالية للمستثمر (جديد، حجز، دفع، عقد، تشغيل)';
