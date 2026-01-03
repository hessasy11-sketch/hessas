/*
  # حذف وإعادة إنشاء دوال الإحصائيات

  1. حذف الدوال القديمة
  2. إعادة إنشائها بالبنية الصحيحة
*/

-- Drop old functions
DROP FUNCTION IF EXISTS get_b2f_opportunity_statistics(uuid);
DROP FUNCTION IF EXISTS get_b2f_opportunity_remaining_trees(uuid);
DROP FUNCTION IF EXISTS get_b2f_opportunity_reserved_trees(uuid);

-- Function to get reserved trees count
CREATE OR REPLACE FUNCTION get_b2f_opportunity_reserved_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reserved_count integer;
BEGIN
  SELECT COALESCE(SUM(number_of_trees), 0)::integer
  INTO reserved_count
  FROM investment_reservations
  WHERE opportunity_id = opportunity_id_param
    AND status IN ('pending', 'confirmed', 'approved', 'active');
  
  RETURN COALESCE(reserved_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- Function to get remaining trees count
CREATE OR REPLACE FUNCTION get_b2f_opportunity_remaining_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_available integer;
  total_reserved integer;
BEGIN
  -- استخدام available_trees بدلاً من total_trees_count
  SELECT available_trees
  INTO total_available
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  IF total_available IS NULL OR total_available = 0 THEN
    RETURN 0;
  END IF;
  
  total_reserved := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  
  RETURN GREATEST(total_available - total_reserved, 0);
END;
$$;

-- Function to get opportunity statistics
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
  -- استخدام available_trees بدلاً من total_trees_count
  SELECT available_trees
  INTO total_available
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  total_reserved := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  total_remaining := get_b2f_opportunity_remaining_trees(opportunity_id_param);
  
  SELECT COUNT(*)::integer
  INTO reservation_count
  FROM investment_reservations
  WHERE opportunity_id = opportunity_id_param
    AND status IN ('pending', 'confirmed', 'approved', 'active');
  
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