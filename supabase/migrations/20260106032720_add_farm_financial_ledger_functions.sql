/*
  # دوال السجل المالي للمزرعة
  
  ## الدوال
  1. add_ledger_entry - إضافة قيد مالي
  2. get_farm_ledger - جلب سجلات مزرعة
  3. get_ledger_monthly_summary - ملخص شهري
  4. get_ledger_categories - جلب التصنيفات
  5. get_farm_financial_stats - إحصائيات مالية للمزرعة
*/

-- =====================================================
-- 1. دالة: إضافة قيد مالي
-- =====================================================
CREATE OR REPLACE FUNCTION add_ledger_entry(
  p_farm_id uuid,
  p_entry_type text,
  p_category_id uuid,
  p_amount numeric,
  p_entry_date date,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_proof_file_url text DEFAULT NULL,
  p_proof_file_name text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_created_by_name text DEFAULT 'مدير المزرعة'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id uuid;
  v_category_name text;
  v_result json;
BEGIN
  -- جلب اسم التصنيف
  SELECT name_ar INTO v_category_name
  FROM farm_ledger_categories
  WHERE id = p_category_id;
  
  IF v_category_name IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  
  -- إضافة القيد
  INSERT INTO farm_financial_ledger (
    farm_id,
    entry_type,
    category_id,
    category_name,
    amount,
    entry_date,
    description,
    notes,
    proof_file_url,
    proof_file_name,
    created_by,
    created_by_name,
    is_approved
  )
  VALUES (
    p_farm_id,
    p_entry_type,
    p_category_id,
    v_category_name,
    p_amount,
    p_entry_date,
    p_description,
    p_notes,
    p_proof_file_url,
    p_proof_file_name,
    p_created_by,
    p_created_by_name,
    true
  )
  RETURNING id INTO v_entry_id;
  
  -- إرجاع النتيجة
  SELECT json_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'message', 'تم إضافة القيد المالي بنجاح'
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- 2. دالة: جلب سجلات مزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_ledger(
  p_farm_id uuid,
  p_entry_type text DEFAULT NULL,  -- NULL = all, 'expense', 'income'
  p_month integer DEFAULT NULL,    -- NULL = all months
  p_year integer DEFAULT NULL,     -- NULL = current year
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  farm_id uuid,
  entry_type text,
  category_id uuid,
  category_name text,
  amount numeric,
  entry_date date,
  description text,
  notes text,
  proof_file_url text,
  proof_file_name text,
  created_by uuid,
  created_by_name text,
  is_approved boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.farm_id,
    l.entry_type,
    l.category_id,
    l.category_name,
    l.amount,
    l.entry_date,
    l.description,
    l.notes,
    l.proof_file_url,
    l.proof_file_name,
    l.created_by,
    l.created_by_name,
    l.is_approved,
    l.created_at
  FROM farm_financial_ledger l
  WHERE l.farm_id = p_farm_id
    AND (p_entry_type IS NULL OR l.entry_type = p_entry_type)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM l.entry_date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM l.entry_date) = p_month)
  ORDER BY l.entry_date DESC, l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 3. دالة: ملخص شهري
-- =====================================================
CREATE OR REPLACE FUNCTION get_ledger_monthly_summary(
  p_farm_id uuid,
  p_month integer DEFAULT NULL,
  p_year integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary json;
  v_month integer;
  v_year integer;
BEGIN
  -- استخدام الشهر والسنة الحالية إذا لم يتم تحديدهما
  v_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::integer);
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  
  WITH monthly_data AS (
    SELECT
      entry_type,
      category_name,
      COUNT(*)::integer as count,
      SUM(amount)::numeric as total
    FROM farm_financial_ledger
    WHERE farm_id = p_farm_id
      AND EXTRACT(YEAR FROM entry_date) = v_year
      AND EXTRACT(MONTH FROM entry_date) = v_month
    GROUP BY entry_type, category_name
  ),
  totals AS (
    SELECT
      SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END)::numeric as total_expenses,
      SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END)::numeric as total_income,
      COUNT(CASE WHEN entry_type = 'expense' THEN 1 END)::integer as expense_count,
      COUNT(CASE WHEN entry_type = 'income' THEN 1 END)::integer as income_count
    FROM farm_financial_ledger
    WHERE farm_id = p_farm_id
      AND EXTRACT(YEAR FROM entry_date) = v_year
      AND EXTRACT(MONTH FROM entry_date) = v_month
  )
  SELECT json_build_object(
    'month', v_month,
    'year', v_year,
    'total_expenses', COALESCE(t.total_expenses, 0),
    'total_income', COALESCE(t.total_income, 0),
    'net_balance', COALESCE(t.total_income, 0) - COALESCE(t.total_expenses, 0),
    'expense_count', COALESCE(t.expense_count, 0),
    'income_count', COALESCE(t.income_count, 0),
    'total_entries', COALESCE(t.expense_count, 0) + COALESCE(t.income_count, 0),
    'by_category', (
      SELECT json_agg(
        json_build_object(
          'entry_type', entry_type,
          'category_name', category_name,
          'count', count,
          'total', total
        )
      )
      FROM monthly_data
    )
  )
  INTO v_summary
  FROM totals t;
  
  RETURN COALESCE(v_summary, json_build_object(
    'month', v_month,
    'year', v_year,
    'total_expenses', 0,
    'total_income', 0,
    'net_balance', 0,
    'expense_count', 0,
    'income_count', 0,
    'total_entries', 0,
    'by_category', '[]'::json
  ));
END;
$$;

-- =====================================================
-- 4. دالة: جلب التصنيفات
-- =====================================================
CREATE OR REPLACE FUNCTION get_ledger_categories(
  p_type text DEFAULT NULL  -- NULL = all, 'expense', 'income'
)
RETURNS TABLE (
  id uuid,
  name_ar text,
  name_en text,
  type text,
  icon text,
  color text,
  display_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name_ar,
    c.name_en,
    c.type,
    c.icon,
    c.color,
    c.display_order
  FROM farm_ledger_categories c
  WHERE c.is_active = true
    AND (p_type IS NULL OR c.type = p_type)
  ORDER BY c.display_order ASC, c.name_ar ASC;
END;
$$;

-- =====================================================
-- 5. دالة: إحصائيات مالية للمزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_financial_stats(
  p_farm_id uuid,
  p_period text DEFAULT 'all'  -- 'all', 'year', 'month'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
  v_start_date date;
BEGIN
  -- تحديد تاريخ البداية حسب الفترة
  CASE p_period
    WHEN 'month' THEN
      v_start_date := date_trunc('month', CURRENT_DATE)::date;
    WHEN 'year' THEN
      v_start_date := date_trunc('year', CURRENT_DATE)::date;
    ELSE
      v_start_date := '1900-01-01'::date;
  END CASE;
  
  WITH stats_data AS (
    SELECT
      COUNT(*)::integer as total_entries,
      COUNT(CASE WHEN entry_type = 'expense' THEN 1 END)::integer as total_expenses_count,
      COUNT(CASE WHEN entry_type = 'income' THEN 1 END)::integer as total_income_count,
      SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END)::numeric as total_expenses,
      SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END)::numeric as total_income,
      AVG(CASE WHEN entry_type = 'expense' THEN amount END)::numeric as avg_expense,
      AVG(CASE WHEN entry_type = 'income' THEN amount END)::numeric as avg_income,
      MIN(entry_date) as first_entry_date,
      MAX(entry_date) as last_entry_date
    FROM farm_financial_ledger
    WHERE farm_id = p_farm_id
      AND entry_date >= v_start_date
  )
  SELECT json_build_object(
    'period', p_period,
    'total_entries', COALESCE(s.total_entries, 0),
    'total_expenses_count', COALESCE(s.total_expenses_count, 0),
    'total_income_count', COALESCE(s.total_income_count, 0),
    'total_expenses', COALESCE(s.total_expenses, 0),
    'total_income', COALESCE(s.total_income, 0),
    'net_balance', COALESCE(s.total_income, 0) - COALESCE(s.total_expenses, 0),
    'avg_expense', ROUND(COALESCE(s.avg_expense, 0), 2),
    'avg_income', ROUND(COALESCE(s.avg_income, 0), 2),
    'first_entry_date', s.first_entry_date,
    'last_entry_date', s.last_entry_date
  )
  INTO v_stats
  FROM stats_data s;
  
  RETURN v_stats;
END;
$$;

-- =====================================================
-- 6. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION add_ledger_entry TO authenticated;
GRANT EXECUTE ON FUNCTION add_ledger_entry TO anon;
GRANT EXECUTE ON FUNCTION get_farm_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_ledger TO anon;
GRANT EXECUTE ON FUNCTION get_ledger_monthly_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_ledger_monthly_summary TO anon;
GRANT EXECUTE ON FUNCTION get_ledger_categories TO authenticated;
GRANT EXECUTE ON FUNCTION get_ledger_categories TO anon;
GRANT EXECUTE ON FUNCTION get_farm_financial_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_financial_stats TO anon;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION add_ledger_entry IS 'إضافة قيد مالي جديد (مصروف أو مدخول)';
COMMENT ON FUNCTION get_farm_ledger IS 'جلب سجلات مزرعة مع فلترة حسب النوع والشهر';
COMMENT ON FUNCTION get_ledger_monthly_summary IS 'ملخص شهري للمصروفات والمداخيل';
COMMENT ON FUNCTION get_ledger_categories IS 'جلب التصنيفات المالية النشطة';
COMMENT ON FUNCTION get_farm_financial_stats IS 'إحصائيات مالية شاملة للمزرعة';
