/*
  # إعادة دوال إحصائيات الفرص الاستثمارية

  1. الدوال:
    - `get_b2f_opportunity_statistics` - احصائيات الفرصة الاستثمارية
    - `get_b2f_opportunity_reserved_trees` - عدد الأشجار المحجوزة
    - `get_b2f_opportunity_remaining_trees` - عدد الأشجار المتبقية
*/

-- Function to get reserved trees count
CREATE OR REPLACE FUNCTION get_b2f_opportunity_reserved_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reserved_count integer;
BEGIN
  SELECT COALESCE(SUM(number_of_trees), 0)
  INTO reserved_count
  FROM investment_reservations
  WHERE opportunity_id = opportunity_id_param
    AND status IN ('pending', 'confirmed');
  
  RETURN reserved_count;
END;
$$;

-- Function to get remaining trees count
CREATE OR REPLACE FUNCTION get_b2f_opportunity_remaining_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_trees integer;
  reserved_count integer;
BEGIN
  SELECT total_trees_count
  INTO total_trees
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  reserved_count := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  
  RETURN GREATEST(total_trees - reserved_count, 0);
END;
$$;

-- Function to get opportunity statistics
CREATE OR REPLACE FUNCTION get_b2f_opportunity_statistics(opportunity_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_trees integer;
  reserved_count integer;
  remaining_count integer;
BEGIN
  -- Get total trees
  SELECT total_trees_count
  INTO total_trees
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  -- Get reserved count
  reserved_count := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  
  -- Calculate remaining
  remaining_count := GREATEST(total_trees - reserved_count, 0);
  
  -- Build result
  result := jsonb_build_object(
    'total_trees', total_trees,
    'reserved_trees', reserved_count,
    'remaining_trees', remaining_count,
    'is_available', remaining_count > 0
  );
  
  RETURN result;
END;
$$;