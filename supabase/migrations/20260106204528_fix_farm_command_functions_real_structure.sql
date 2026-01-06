/*
  # إصلاح دوال غرفة عمليات المزارع - البنية الفعلية

  1. المشاكل المكتشفة
    - fc_financial_ledger يستخدم transaction_type بدلاً من entry_type
    - get_farms_by_health_category فيها مشكلة GROUP BY
    - جدول farm_expenses موجود للمصروفات الحرجة

  2. الإصلاح
    - تحديث جميع الدوال لتطابق البنية الفعلية
*/

-- حذف الدوال القديمة وإعادة إنشائها بالبنية الصحيحة
DROP FUNCTION IF EXISTS get_farm_command_pulse();
DROP FUNCTION IF EXISTS get_farms_by_health_category();

-- دالة: نبض القيادة (مصلحة)
CREATE OR REPLACE FUNCTION get_farm_command_pulse()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_active_farms int := 0;
  v_at_risk_farms int := 0;
  v_pending_decisions int := 0;
  v_high_expenses_today numeric := 0;
BEGIN
  -- عدد المزارع النشطة
  SELECT COUNT(*)
  INTO v_active_farms
  FROM b2f_farms
  WHERE operational_status = 'active';

  -- مزارع تحتاج تدخل (At Risk)
  SELECT COUNT(DISTINCT ft.farm_id)
  INTO v_at_risk_farms
  FROM farm_tasks ft
  WHERE ft.status IN ('new', 'in_progress')
    AND ft.due_date < NOW()
    AND ft.farm_id IS NOT NULL;

  -- إضافة مزارع بدون مدير
  v_at_risk_farms := v_at_risk_farms + (
    SELECT COUNT(*)
    FROM b2f_farms bf
    WHERE bf.operational_status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM fc_operational_farms fof
        WHERE fof.reference_farm_id = bf.id
          AND fof.farm_manager_id IS NOT NULL
      )
  );

  -- قرارات معلقة
  SELECT COUNT(*)
  INTO v_pending_decisions
  FROM b2f_decision_queue
  WHERE status = 'pending';

  -- مصروفات حرجة اليوم (من farm_expenses إذا موجود، أو fc_financial_ledger)
  BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_high_expenses_today
    FROM farm_expenses
    WHERE status IN ('pending', 'approved')
      AND created_at::date = CURRENT_DATE
      AND amount >= 5000;
  EXCEPTION WHEN OTHERS THEN
    -- إذا لم يوجد farm_expenses، استخدم fc_financial_ledger
    SELECT COALESCE(SUM(ffl.amount), 0)
    INTO v_high_expenses_today
    FROM fc_financial_ledger ffl
    WHERE ffl.transaction_type = 'expense'
      AND ffl.transaction_date = CURRENT_DATE
      AND ffl.amount >= 5000;
  END;

  v_result := jsonb_build_object(
    'active_farms', v_active_farms,
    'at_risk_farms', v_at_risk_farms,
    'pending_decisions', v_pending_decisions,
    'high_expenses_today', v_high_expenses_today
  );

  RETURN v_result;
END;
$$;

-- دالة: تصنيف صحة المزارع (مصلحة)
CREATE OR REPLACE FUNCTION get_farms_by_health_category()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_newly_born jsonb;
  v_no_manager jsonb;
  v_at_risk jsonb;
  v_healthy jsonb;
BEGIN
  -- مزارع جديدة (Newly Born): آخر 7 أيام
  WITH newly_born_farms AS (
    SELECT 
      bf.id,
      bf.name,
      bf.location,
      bf.created_at
    FROM b2f_farms bf
    WHERE bf.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY bf.created_at DESC
    LIMIT 10
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'location', location,
      'created_at', created_at
    )
  )
  INTO v_newly_born
  FROM newly_born_farms;

  -- مزارع بدون مدير (No Manager)
  WITH no_manager_farms AS (
    SELECT 
      bf.id,
      bf.name,
      bf.location,
      bf.created_at
    FROM b2f_farms bf
    WHERE bf.operational_status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM fc_operational_farms fof
        WHERE fof.reference_farm_id = bf.id
          AND fof.farm_manager_id IS NOT NULL
      )
    ORDER BY bf.created_at ASC
    LIMIT 10
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'location', location,
      'created_at', created_at
    )
  )
  INTO v_no_manager
  FROM no_manager_farms;

  -- مزارع متعثرة (At Risk): لديها مهام متأخرة
  WITH at_risk_farms AS (
    SELECT 
      bf.id,
      bf.name,
      bf.location,
      bf.created_at,
      COUNT(ft.id) as overdue_count
    FROM b2f_farms bf
    LEFT JOIN farm_tasks ft ON ft.farm_id = bf.id
      AND ft.status IN ('new', 'in_progress')
      AND ft.due_date < NOW()
    WHERE bf.operational_status = 'active'
    GROUP BY bf.id, bf.name, bf.location, bf.created_at
    HAVING COUNT(ft.id) > 0
    ORDER BY COUNT(ft.id) DESC, bf.created_at DESC
    LIMIT 10
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'location', location,
      'created_at', created_at,
      'overdue_count', overdue_count
    )
  )
  INTO v_at_risk
  FROM at_risk_farms;

  -- مزارع جاهزة (Healthy): لا مشاكل ولديها مدير
  WITH healthy_farms AS (
    SELECT 
      bf.id,
      bf.name,
      bf.location,
      bf.created_at
    FROM b2f_farms bf
    WHERE bf.operational_status = 'active'
      AND EXISTS (
        SELECT 1 FROM fc_operational_farms fof
        WHERE fof.reference_farm_id = bf.id
          AND fof.farm_manager_id IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM farm_tasks ft
        WHERE ft.farm_id = bf.id
          AND ft.status IN ('new', 'in_progress')
          AND ft.due_date < NOW()
      )
    ORDER BY bf.created_at DESC
    LIMIT 10
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'location', location,
      'created_at', created_at
    )
  )
  INTO v_healthy
  FROM healthy_farms;

  v_result := jsonb_build_object(
    'newly_born', COALESCE(v_newly_born, '[]'::jsonb),
    'no_manager', COALESCE(v_no_manager, '[]'::jsonb),
    'at_risk', COALESCE(v_at_risk, '[]'::jsonb),
    'healthy', COALESCE(v_healthy, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
