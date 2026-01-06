/*
  # المرحلة 3: لوحة مقارنة المزارع في غرفة عمليات B2F
  
  ## الهدف
  عرض قائمة مرتبة لجميع المزارع حسب الأداء:
  - Top 5 (أفضل أداء)
  - Needs Attention (تحتاج تدخل - درجة < 60)
  
  ## البيانات المُرجعة
  - اسم المزرعة
  - الدرجة الكلية
  - الشارة
  - سبب مختصر (أكبر مشكلة)
  - الحالة التشغيلية
*/

-- =====================================================
-- دالة: get_all_farms_scores
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_farms_scores(
  p_period_days integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm record;
  v_farm_score json;
  v_farms_list json[] := '{}';
  v_top_5 json[];
  v_needs_attention json[];
  v_result json;
BEGIN
  -- المرور على جميع المزارع النشطة
  FOR v_farm IN 
    SELECT id, name, location, city, operational_status
    FROM b2f_farms
    WHERE operational_status IN ('active', 'setup')
    ORDER BY name
  LOOP
    -- الحصول على درجة المزرعة
    SELECT get_farm_manager_score(v_farm.id, p_period_days) INTO v_farm_score;
    
    -- إضافة معلومات المزرعة
    v_farm_score := v_farm_score || jsonb_build_object(
      'farm_name', v_farm.name,
      'farm_location', v_farm.location,
      'farm_city', v_farm.city,
      'operational_status', v_farm.operational_status
    );
    
    -- إضافة سبب مختصر (أكبر مشكلة)
    v_farm_score := v_farm_score || jsonb_build_object(
      'main_issue', get_farm_main_issue(v_farm_score)
    );
    
    v_farms_list := array_append(v_farms_list, v_farm_score);
  END LOOP;
  
  -- ترتيب حسب الدرجة (تنازلي)
  v_farms_list := ARRAY(
    SELECT jsonb_array_elements(to_jsonb(v_farms_list))
    ORDER BY (jsonb_array_elements(to_jsonb(v_farms_list))->>'total_score')::numeric DESC
  );
  
  -- Top 5
  v_top_5 := v_farms_list[1:5];
  
  -- Needs Attention (درجة < 60)
  SELECT ARRAY_AGG(farm_data)
  INTO v_needs_attention
  FROM unnest(v_farms_list) AS farm_data
  WHERE (farm_data->>'total_score')::numeric < 60;
  
  -- بناء النتيجة
  v_result := json_build_object(
    'period_days', p_period_days,
    'total_farms', array_length(v_farms_list, 1),
    'top_5', COALESCE(v_top_5, '{}'),
    'needs_attention', COALESCE(v_needs_attention, '{}'),
    'all_farms', v_farms_list
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- دالة مساعدة: get_farm_main_issue
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_main_issue(
  p_farm_score json
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_breakdown json;
  v_tasks_score numeric;
  v_proofs_score numeric;
  v_financial_score numeric;
  v_response_score numeric;
  v_min_score numeric;
  v_issue text;
  v_overdue integer;
  v_rejected_expenses integer;
BEGIN
  v_breakdown := p_farm_score->'breakdown';
  
  -- استخراج الدرجات
  v_tasks_score := (v_breakdown->'tasks_commitment'->>'score')::numeric;
  v_proofs_score := (v_breakdown->'proof_quality'->>'score')::numeric;
  v_financial_score := (v_breakdown->'financial_discipline'->>'score')::numeric;
  v_response_score := (v_breakdown->'response_time'->>'score')::numeric;
  
  -- استخراج التفاصيل
  v_overdue := (v_breakdown->'tasks_commitment'->>'overdue')::integer;
  v_rejected_expenses := (v_breakdown->'financial_discipline'->>'rejected')::integer;
  
  -- تحديد أقل درجة
  v_min_score := LEAST(v_tasks_score, v_proofs_score, v_financial_score, v_response_score);
  
  -- تحديد السبب الرئيسي
  IF v_min_score = v_tasks_score THEN
    IF v_overdue > 0 THEN
      v_issue := v_overdue || ' مهام متأخرة';
    ELSE
      v_issue := 'معدل إنجاز منخفض';
    END IF;
  ELSIF v_min_score = v_proofs_score THEN
    v_issue := 'جودة إثباتات ضعيفة';
  ELSIF v_min_score = v_financial_score THEN
    IF v_rejected_expenses > 0 THEN
      v_issue := v_rejected_expenses || ' مصروفات مرفوضة';
    ELSE
      v_issue := 'انضباط مالي ضعيف';
    END IF;
  ELSE
    v_issue := 'استجابة بطيئة';
  END IF;
  
  -- إذا كانت الدرجة ممتازة
  IF (p_farm_score->>'total_score')::numeric >= 90 THEN
    v_issue := 'أداء ممتاز';
  ELSIF (p_farm_score->>'total_score')::numeric >= 80 THEN
    v_issue := 'أداء جيد جداً';
  ELSIF (p_farm_score->>'total_score')::numeric >= 70 THEN
    v_issue := 'أداء جيد';
  END IF;
  
  RETURN v_issue;
END;
$$;

-- =====================================================
-- دالة سريعة: get_farms_quick_comparison
-- =====================================================
CREATE OR REPLACE FUNCTION get_farms_quick_comparison()
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  total_score numeric,
  badge text,
  main_issue text,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH farm_scores AS (
    SELECT 
      f.id,
      f.name,
      (get_farm_manager_score(f.id, 30)->>'total_score')::numeric as score,
      get_farm_manager_score(f.id, 30)->>'badge' as badge_text,
      get_farm_main_issue(get_farm_manager_score(f.id, 30)) as issue
    FROM b2f_farms f
    WHERE f.operational_status IN ('active', 'setup')
  )
  SELECT 
    id,
    name,
    score,
    badge_text,
    issue,
    ROW_NUMBER() OVER (ORDER BY score DESC)::integer
  FROM farm_scores
  ORDER BY score DESC;
END;
$$;

-- =====================================================
-- Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_all_farms_scores TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_farms_scores TO anon;
GRANT EXECUTE ON FUNCTION get_farm_main_issue TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_main_issue TO anon;
GRANT EXECUTE ON FUNCTION get_farms_quick_comparison TO authenticated;
GRANT EXECUTE ON FUNCTION get_farms_quick_comparison TO anon;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION get_all_farms_scores IS 'جميع المزارع مع درجاتها مرتبة - يُستخدم في غرفة العمليات B2F';
COMMENT ON FUNCTION get_farm_main_issue IS 'تحديد المشكلة الرئيسية للمزرعة بناءً على أقل درجة';
COMMENT ON FUNCTION get_farms_quick_comparison IS 'مقارنة سريعة للمزارع - جدول بسيط';
