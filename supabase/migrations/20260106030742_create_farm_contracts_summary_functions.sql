/*
  # دوال إحصائيات العقود المرتبطة بالمزرعة - المرحلة 3
  
  ## الهدف
  توفير دوال لجلب إحصائيات وتفاصيل العقود المرتبطة بمزرعة معينة
  لعرضها في بطاقة "العقود والاستثمارات المرتبطة"
  
  ## الدوال
  1. get_farm_contracts_summary - إحصائيات شاملة
  2. get_farm_contracts_list - قائمة تفصيلية بالعقود
  3. get_farm_last_contract - آخر عقد تم توثيقه
*/

-- =====================================================
-- 1. دالة: إحصائيات العقود المرتبطة بالمزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_contracts_summary(
  p_farm_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary json;
BEGIN
  SELECT json_build_object(
    'farm_id', p_farm_id,
    'total_contracts', COUNT(*)::integer,
    'active_contracts', COUNT(*) FILTER (WHERE status = 'active')::integer,
    'draft_contracts', COUNT(*) FILTER (WHERE status = 'draft')::integer,
    'cancelled_contracts', COUNT(*) FILTER (WHERE status = 'cancelled')::integer,
    'expired_contracts', COUNT(*) FILTER (WHERE status = 'expired')::integer,
    
    'total_trees', COALESCE(SUM(COALESCE(trees_count, tree_count, 0)), 0)::integer,
    'total_investment', COALESCE(SUM(COALESCE(amount_total, total_amount, 0)), 0)::numeric,
    'total_paid', COALESCE(SUM(COALESCE(paid_amount, 0)), 0)::numeric,
    'total_remaining', COALESCE(SUM(COALESCE(remaining_amount, 0)), 0)::numeric,
    
    'unique_investors', COUNT(DISTINCT COALESCE(investor_phone, current_beneficiary_phone))::integer,
    
    'last_contract_date', MAX(created_at),
    'last_contract_number', (
      SELECT contract_number 
      FROM b2f_contracts 
      WHERE farm_id = p_farm_id 
      ORDER BY created_at DESC 
      LIMIT 1
    ),
    
    'has_contracts', (COUNT(*) > 0)
  )
  INTO v_summary
  FROM b2f_contracts
  WHERE farm_id = p_farm_id;
  
  RETURN v_summary;
END;
$$;

-- =====================================================
-- 2. دالة: قائمة تفصيلية بالعقود المرتبطة بالمزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_contracts_list(
  p_farm_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  contract_id uuid,
  contract_number text,
  contract_type text,
  status text,
  investor_phone text,
  investor_name text,
  trees_count integer,
  amount_total numeric,
  paid_amount numeric,
  remaining_amount numeric,
  start_date date,
  end_date date,
  duration_years integer,
  operation_status text,
  is_transferred boolean,
  created_at timestamptz,
  days_active integer,
  is_expired boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as contract_id,
    c.contract_number,
    c.contract_type,
    c.status,
    COALESCE(c.investor_phone, c.current_beneficiary_phone) as investor_phone,
    COALESCE(c.current_beneficiary_name, c.original_beneficiary_name) as investor_name,
    COALESCE(c.trees_count, c.tree_count, 0) as trees_count,
    COALESCE(c.amount_total, c.total_amount, 0) as amount_total,
    COALESCE(c.paid_amount, 0) as paid_amount,
    COALESCE(c.remaining_amount, 0) as remaining_amount,
    c.start_date,
    c.end_date,
    c.duration_years,
    c.operation_status,
    COALESCE(c.is_transferred, false) as is_transferred,
    c.created_at,
    CASE 
      WHEN c.start_date IS NOT NULL THEN 
        EXTRACT(DAY FROM (CURRENT_DATE - c.start_date))::integer
      ELSE 0
    END as days_active,
    CASE
      WHEN c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE THEN true
      ELSE false
    END as is_expired
  FROM b2f_contracts c
  WHERE c.farm_id = p_farm_id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 3. دالة: آخر عقد تم توثيقه للمزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_last_contract(
  p_farm_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract json;
BEGIN
  SELECT json_build_object(
    'contract_id', c.id,
    'contract_number', c.contract_number,
    'contract_type', c.contract_type,
    'status', c.status,
    'investor_phone', COALESCE(c.investor_phone, c.current_beneficiary_phone),
    'investor_name', COALESCE(c.current_beneficiary_name, c.original_beneficiary_name),
    'trees_count', COALESCE(c.trees_count, c.tree_count, 0),
    'amount_total', COALESCE(c.amount_total, c.total_amount, 0),
    'start_date', c.start_date,
    'end_date', c.end_date,
    'duration_years', c.duration_years,
    'created_at', c.created_at,
    'operation_status', c.operation_status,
    'days_since_created', EXTRACT(DAY FROM (now() - c.created_at))::integer
  )
  INTO v_contract
  FROM b2f_contracts c
  WHERE c.farm_id = p_farm_id
  ORDER BY c.created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_contract, '{}'::json);
END;
$$;

-- =====================================================
-- 4. دالة: إحصائيات سريعة للعقود (للبطاقة)
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_contracts_quick_stats(
  p_farm_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
  v_last_contract json;
BEGIN
  -- الحصول على الإحصائيات الأساسية
  SELECT json_build_object(
    'total_contracts', COUNT(*)::integer,
    'active_contracts', COUNT(*) FILTER (WHERE status = 'active')::integer,
    'total_trees', COALESCE(SUM(COALESCE(trees_count, tree_count, 0)), 0)::integer,
    'total_investment', COALESCE(SUM(COALESCE(amount_total, total_amount, 0)), 0)::numeric,
    'unique_investors', COUNT(DISTINCT COALESCE(investor_phone, current_beneficiary_phone))::integer
  )
  INTO v_stats
  FROM b2f_contracts
  WHERE farm_id = p_farm_id;
  
  -- الحصول على آخر عقد
  SELECT get_farm_last_contract(p_farm_id) INTO v_last_contract;
  
  -- دمج البيانات
  RETURN json_build_object(
    'stats', v_stats,
    'last_contract', v_last_contract
  );
END;
$$;

-- =====================================================
-- 5. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_farm_contracts_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_contracts_summary(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_farm_contracts_list(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_contracts_list(uuid, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_farm_last_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_last_contract(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_farm_contracts_quick_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_contracts_quick_stats(uuid) TO anon;

-- =====================================================
-- تعليقات توضيحية
-- =====================================================
COMMENT ON FUNCTION get_farm_contracts_summary IS 'إحصائيات شاملة للعقود المرتبطة بمزرعة';
COMMENT ON FUNCTION get_farm_contracts_list IS 'قائمة تفصيلية بالعقود المرتبطة بمزرعة';
COMMENT ON FUNCTION get_farm_last_contract IS 'آخر عقد تم توثيقه للمزرعة';
COMMENT ON FUNCTION get_farm_contracts_quick_stats IS 'إحصائيات سريعة للعرض في البطاقة';
