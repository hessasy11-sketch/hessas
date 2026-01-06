/*
  # تصحيح دالة get_all_farms_scores
  
  تصحيح خطأ json || jsonb باستخدام to_jsonb
*/

CREATE OR REPLACE FUNCTION get_all_farms_scores(
  p_period_days integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm record;
  v_farm_score jsonb;
  v_farms_list jsonb[] := '{}';
  v_top_5 jsonb[];
  v_needs_attention jsonb[];
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
    SELECT to_jsonb(get_farm_manager_score(v_farm.id, p_period_days)) INTO v_farm_score;
    
    -- إضافة معلومات المزرعة
    v_farm_score := v_farm_score || jsonb_build_object(
      'farm_name', v_farm.name,
      'farm_location', v_farm.location,
      'farm_city', v_farm.city,
      'operational_status', v_farm.operational_status
    );
    
    -- إضافة سبب مختصر (أكبر مشكلة)
    v_farm_score := v_farm_score || jsonb_build_object(
      'main_issue', get_farm_main_issue(v_farm_score::json)
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
    'top_5', COALESCE(to_json(v_top_5), '[]'::json),
    'needs_attention', COALESCE(to_json(v_needs_attention), '[]'::json),
    'all_farms', to_json(v_farms_list)
  );
  
  RETURN v_result;
END;
$$;
