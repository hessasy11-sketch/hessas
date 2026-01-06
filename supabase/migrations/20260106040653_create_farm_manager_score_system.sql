/*
  # المرحلة 2: نظام تقييم مدير المزرعة (Farm Manager Score)
  
  ## الهدف
  حساب درجة تقييم شهرية لمدير المزرعة من 100 بناءً على:
  1. الالتزام بالمهام (30%) - نسبة المهام المكتملة مقابل المتأخرة
  2. جودة الإثباتات (25%) - نسبة الإثباتات المقبولة
  3. الانضباط المالي (25%) - نسبة المصروفات المعتمدة
  4. الاستجابة (20%) - سرعة إغلاق المهام
  
  ## النتيجة
  - درجة من 100
  - شارة: ممتاز (90+) / جيد (70-89) / يحتاج تحسين (<70)
  - تفاصيل كل معيار
*/

-- =====================================================
-- دالة: get_farm_manager_score
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_manager_score(
  p_farm_id uuid,
  p_period_days integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- متغيرات الالتزام بالمهام (30%)
  v_total_tasks integer;
  v_completed_tasks integer;
  v_overdue_tasks integer;
  v_tasks_score numeric;
  v_tasks_percentage numeric;
  
  -- متغيرات جودة الإثباتات (25%)
  v_total_proofs integer;
  v_approved_proofs integer;
  v_rejected_proofs integer;
  v_proofs_score numeric;
  v_proofs_percentage numeric;
  
  -- متغيرات الانضباط المالي (25%)
  v_total_expenses integer;
  v_approved_expenses integer;
  v_rejected_expenses integer;
  v_financial_score numeric;
  v_financial_percentage numeric;
  
  -- متغيرات الاستجابة (20%)
  v_avg_completion_hours numeric;
  v_response_score numeric;
  v_response_grade text;
  
  -- النتيجة النهائية
  v_total_score numeric;
  v_badge text;
  v_badge_color text;
  v_grade text;
  v_result json;
BEGIN
  -- =====================================================
  -- 1. الالتزام بالمهام (30%)
  -- =====================================================
  
  -- إجمالي المهام في الفترة
  SELECT COUNT(*)::integer INTO v_total_tasks
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND created_at >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- المهام المكتملة
  SELECT COUNT(*)::integer INTO v_completed_tasks
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'approved'
    AND created_at >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- المهام المتأخرة
  SELECT COUNT(*)::integer INTO v_overdue_tasks
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status IN ('pending', 'in_progress', 'submitted')
    AND due_date < CURRENT_DATE
    AND created_at >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- حساب درجة الالتزام
  IF v_total_tasks > 0 THEN
    v_tasks_percentage := (v_completed_tasks::numeric / v_total_tasks) * 100;
    -- خصم 5 نقاط عن كل مهمة متأخرة
    v_tasks_score := GREATEST(0, (v_tasks_percentage - (v_overdue_tasks * 5)));
    -- الحد الأقصى 30
    v_tasks_score := LEAST(30, v_tasks_score * 0.3);
  ELSE
    v_tasks_percentage := 0;
    v_tasks_score := 0;
  END IF;
  
  -- =====================================================
  -- 2. جودة الإثباتات (25%)
  -- =====================================================
  
  -- إجمالي المهام التي تتطلب إثبات
  SELECT COUNT(*)::integer INTO v_total_proofs
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND requires_proof = true
    AND created_at >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- الإثباتات المقبولة (المهام المعتمدة مع proof)
  SELECT COUNT(*)::integer INTO v_approved_proofs
  FROM farm_tasks ft
  WHERE ft.farm_id = p_farm_id
    AND ft.requires_proof = true
    AND ft.status = 'approved'
    AND EXISTS (
      SELECT 1 FROM task_proofs tp
      WHERE tp.task_id = ft.id
    )
    AND ft.created_at >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- الإثباتات المرفوضة
  SELECT COUNT(*)::integer INTO v_rejected_proofs
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND requires_proof = true
    AND status = 'rejected'
    AND created_at >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- حساب درجة الإثباتات
  IF v_total_proofs > 0 THEN
    v_proofs_percentage := (v_approved_proofs::numeric / v_total_proofs) * 100;
    v_proofs_score := (v_proofs_percentage * 0.25);
  ELSE
    v_proofs_percentage := 100; -- لا يوجد إثباتات مطلوبة = درجة كاملة
    v_proofs_score := 25;
  END IF;
  
  -- =====================================================
  -- 3. الانضباط المالي (25%)
  -- =====================================================
  
  -- إجمالي المصروفات المقدمة
  SELECT COUNT(*)::integer INTO v_total_expenses
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND entry_date >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- المصروفات المعتمدة
  SELECT COUNT(*)::integer INTO v_approved_expenses
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND is_approved = true
    AND entry_date >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- المصروفات المرفوضة
  SELECT COUNT(*)::integer INTO v_rejected_expenses
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND approval_status = 'rejected'
    AND entry_date >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- حساب درجة الانضباط المالي
  IF v_total_expenses > 0 THEN
    v_financial_percentage := (v_approved_expenses::numeric / v_total_expenses) * 100;
    v_financial_score := (v_financial_percentage * 0.25);
  ELSE
    v_financial_percentage := 100; -- لا يوجد مصروفات = درجة كاملة
    v_financial_score := 25;
  END IF;
  
  -- =====================================================
  -- 4. الاستجابة (20%)
  -- =====================================================
  
  -- متوسط وقت إغلاق المهام (بالساعات)
  SELECT AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600)
  INTO v_avg_completion_hours
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'approved'
    AND approved_at IS NOT NULL
    AND created_at >= CURRENT_DATE - (p_period_days || ' days')::interval;
  
  -- حساب درجة الاستجابة
  -- ممتاز: أقل من 24 ساعة = 20 نقطة
  -- جيد: 24-72 ساعة = 15 نقطة
  -- متوسط: 72-168 ساعة (أسبوع) = 10 نقاط
  -- ضعيف: أكثر من أسبوع = 5 نقاط
  
  IF v_avg_completion_hours IS NULL OR v_avg_completion_hours = 0 THEN
    v_response_score := 10; -- لا يوجد بيانات كافية
    v_response_grade := 'لا يوجد بيانات كافية';
  ELSIF v_avg_completion_hours <= 24 THEN
    v_response_score := 20;
    v_response_grade := 'ممتاز - أقل من يوم';
  ELSIF v_avg_completion_hours <= 72 THEN
    v_response_score := 15;
    v_response_grade := 'جيد - 1-3 أيام';
  ELSIF v_avg_completion_hours <= 168 THEN
    v_response_score := 10;
    v_response_grade := 'متوسط - 3-7 أيام';
  ELSE
    v_response_score := 5;
    v_response_grade := 'بطيء - أكثر من أسبوع';
  END IF;
  
  -- =====================================================
  -- حساب الدرجة النهائية
  -- =====================================================
  
  v_total_score := ROUND(v_tasks_score + v_proofs_score + v_financial_score + v_response_score, 1);
  
  -- تحديد الشارة
  IF v_total_score >= 90 THEN
    v_badge := 'ممتاز';
    v_badge_color := 'green';
    v_grade := 'A+';
  ELSIF v_total_score >= 80 THEN
    v_badge := 'جيد جداً';
    v_badge_color := 'blue';
    v_grade := 'A';
  ELSIF v_total_score >= 70 THEN
    v_badge := 'جيد';
    v_badge_color := 'cyan';
    v_grade := 'B';
  ELSIF v_total_score >= 60 THEN
    v_badge := 'مقبول';
    v_badge_color := 'yellow';
    v_grade := 'C';
  ELSE
    v_badge := 'يحتاج تحسين';
    v_badge_color := 'red';
    v_grade := 'D';
  END IF;
  
  -- =====================================================
  -- بناء النتيجة
  -- =====================================================
  
  v_result := json_build_object(
    'farm_id', p_farm_id,
    'period_days', p_period_days,
    'total_score', v_total_score,
    'badge', v_badge,
    'badge_color', v_badge_color,
    'grade', v_grade,
    'breakdown', json_build_object(
      'tasks_commitment', json_build_object(
        'score', ROUND(v_tasks_score, 1),
        'max_score', 30,
        'percentage', ROUND(v_tasks_percentage, 1),
        'completed', v_completed_tasks,
        'overdue', v_overdue_tasks,
        'total', v_total_tasks
      ),
      'proof_quality', json_build_object(
        'score', ROUND(v_proofs_score, 1),
        'max_score', 25,
        'percentage', ROUND(v_proofs_percentage, 1),
        'approved', v_approved_proofs,
        'rejected', v_rejected_proofs,
        'total', v_total_proofs
      ),
      'financial_discipline', json_build_object(
        'score', ROUND(v_financial_score, 1),
        'max_score', 25,
        'percentage', ROUND(v_financial_percentage, 1),
        'approved', v_approved_expenses,
        'rejected', v_rejected_expenses,
        'total', v_total_expenses
      ),
      'response_time', json_build_object(
        'score', ROUND(v_response_score, 1),
        'max_score', 20,
        'avg_hours', ROUND(COALESCE(v_avg_completion_hours, 0), 1),
        'grade', v_response_grade
      )
    )
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- دالة مساعدة: مقارنة أداء المزارع
-- =====================================================
CREATE OR REPLACE FUNCTION compare_farm_managers_performance(
  p_farm_ids uuid[],
  p_period_days integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_results json[] := '{}';
  v_farm_score json;
  v_farm_name text;
BEGIN
  FOREACH v_farm_id IN ARRAY p_farm_ids
  LOOP
    -- الحصول على اسم المزرعة
    SELECT name INTO v_farm_name
    FROM b2f_farms
    WHERE id = v_farm_id;
    
    -- الحصول على الدرجة
    SELECT get_farm_manager_score(v_farm_id, p_period_days) INTO v_farm_score;
    
    -- إضافة اسم المزرعة
    v_farm_score := v_farm_score || jsonb_build_object('farm_name', v_farm_name);
    
    v_results := array_append(v_results, v_farm_score);
  END LOOP;
  
  RETURN json_build_object(
    'farms_count', array_length(p_farm_ids, 1),
    'period_days', p_period_days,
    'results', v_results
  );
END;
$$;

-- =====================================================
-- Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_farm_manager_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_manager_score TO anon;
GRANT EXECUTE ON FUNCTION compare_farm_managers_performance TO authenticated;
GRANT EXECUTE ON FUNCTION compare_farm_managers_performance TO anon;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION get_farm_manager_score IS 'حساب درجة تقييم مدير المزرعة من 100 بناءً على 4 معايير';
COMMENT ON FUNCTION compare_farm_managers_performance IS 'مقارنة أداء مديري المزارع - يستقبل array من farm_ids';
