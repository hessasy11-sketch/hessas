/*
  # تحديث دوال الإحصائيات للنظام الجديد

  1. تحديث الدوال لتستخدم جدول b2f_investment_requests الجديد
  2. تحديث الحالات المعتبرة "نشطة" حسب النظام الجديد
  3. إصلاح منطق حساب الأشجار المتاحة والمحجوزة
*/

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS get_b2f_opportunity_statistics(uuid);
DROP FUNCTION IF EXISTS get_b2f_opportunity_remaining_trees(uuid);
DROP FUNCTION IF EXISTS get_b2f_opportunity_reserved_trees(uuid);

-- Function: حساب عدد الأشجار المحجوزة من الطلبات النشطة
CREATE OR REPLACE FUNCTION get_b2f_opportunity_reserved_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reserved_count integer;
BEGIN
  -- حساب الأشجار المحجوزة من الطلبات النشطة فقط
  -- (نستثني rejected و transferred_to_operations)
  SELECT COALESCE(SUM(number_of_trees), 0)::integer
  INTO reserved_count
  FROM b2f_investment_requests
  WHERE opportunity_id = opportunity_id_param
    AND status IN ('new', 'awaiting_payment', 'payment_uploaded', 'payment_verified', 'contract_ready');
  
  RETURN COALESCE(reserved_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- Function: حساب عدد الأشجار المتبقية
CREATE OR REPLACE FUNCTION get_b2f_opportunity_remaining_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_available integer;
  total_reserved integer;
BEGIN
  -- الحصول على إجمالي الأشجار المتاحة من العرض
  SELECT available_trees
  INTO total_available
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  IF total_available IS NULL OR total_available = 0 THEN
    RETURN 0;
  END IF;
  
  -- حساب الأشجار المحجوزة
  total_reserved := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  
  -- إرجاع المتبقي (لا يقل عن صفر)
  RETURN GREATEST(total_available - total_reserved, 0);
END;
$$;

-- Function: الحصول على إحصائيات العرض الكاملة
CREATE OR REPLACE FUNCTION get_b2f_opportunity_statistics(opportunity_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_available integer;
  total_reserved integer;
  total_remaining integer;
  reservation_count integer;
BEGIN
  -- الحصول على إجمالي الأشجار المتاحة
  SELECT available_trees
  INTO total_available
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  -- حساب الأشجار المحجوزة
  total_reserved := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  
  -- حساب الأشجار المتبقية
  total_remaining := get_b2f_opportunity_remaining_trees(opportunity_id_param);
  
  -- حساب عدد المستثمرين (الطلبات النشطة فقط)
  SELECT COUNT(*)::integer
  INTO reservation_count
  FROM b2f_investment_requests
  WHERE opportunity_id = opportunity_id_param
    AND status IN ('new', 'awaiting_payment', 'payment_uploaded', 'payment_verified', 'contract_ready');
  
  -- بناء النتيجة
  result := json_build_object(
    'available_trees', COALESCE(total_available, 0),
    'reserved_trees', total_reserved,
    'remaining_trees', total_remaining,
    'reservation_count', reservation_count,
    'is_full', (total_remaining = 0)
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'available_trees', 0,
      'reserved_trees', 0,
      'remaining_trees', 0,
      'reservation_count', 0,
      'is_full', false
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_b2f_opportunity_reserved_trees(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_b2f_opportunity_remaining_trees(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_b2f_opportunity_statistics(uuid) TO anon, authenticated;
