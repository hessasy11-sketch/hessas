/*
  # إصلاح دوال حساب إحصائيات العروض الاستثمارية
  
  1. التغييرات
    - إزالة الشرط على عمود transferred_to_operations غير الموجود
    - تحديث قائمة الحالات المحسوبة
    
  2. الهدف
    - إصلاح حساب الأشجار المحجوزة والمتبقية
*/

-- إعادة إنشاء دالة حساب الأشجار المحجوزة
CREATE OR REPLACE FUNCTION get_b2f_opportunity_reserved_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reserved_count integer;
BEGIN
  -- حساب الأشجار المحجوزة من الطلبات النشطة فقط
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'b2f_sales_requests'
  ) THEN
    SELECT COALESCE(SUM(number_of_trees), 0)::integer
    INTO reserved_count
    FROM b2f_sales_requests
    WHERE opportunity_id = opportunity_id_param
    AND status IN ('collection_queue', 'payment_open', 'receipt_uploaded', 'receipt_approved', 'contract_issued');
  ELSE
    reserved_count := 0;
  END IF;

  RETURN COALESCE(reserved_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- إعادة إنشاء دالة حساب الأشجار المتبقية
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

-- إعادة إنشاء دالة حساب الإحصائيات الكاملة
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
  reservation_count := 0;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'b2f_sales_requests'
  ) THEN
    SELECT COUNT(DISTINCT investor_phone)::integer
    INTO reservation_count
    FROM b2f_sales_requests
    WHERE opportunity_id = opportunity_id_param
    AND status IN ('collection_queue', 'payment_open', 'receipt_uploaded', 'receipt_approved', 'contract_issued');
  END IF;

  -- بناء النتيجة
  result := json_build_object(
    'available_trees', COALESCE(total_available, 0),
    'reserved_trees', total_reserved,
    'remaining_trees', total_remaining,
    'reservation_count', COALESCE(reservation_count, 0),
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