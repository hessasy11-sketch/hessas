/*
  # غرفة عمليات قيادة المزارع (Farm Command Operations Room)

  1. دوال RPC للإحصائيات القيادية
    - `get_farm_command_pulse()` - نبض القيادة (4 مؤشرات)
    - `get_farms_by_health_category()` - تصنيف صحة المزارع
    - `get_farms_command_list()` - القائمة المختصرة للمزارع

  2. الغرض
    - واجهة قيادية وليست تشغيلية
    - مراقبة + قرار + توجيه فقط
*/

-- دالة: نبض القيادة (Pulse Bar)
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
  -- منطق: لديها مهام متأخرة أو مصروفات معلقة
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

  -- مصروفات حرجة اليوم (أكثر من 5000 ر.س)
  SELECT COALESCE(SUM(ffl.amount), 0)
  INTO v_high_expenses_today
  FROM fc_financial_ledger ffl
  WHERE ffl.entry_type = 'expense'
    AND ffl.transaction_date >= CURRENT_DATE
    AND ffl.amount >= 5000;

  v_result := jsonb_build_object(
    'active_farms', v_active_farms,
    'at_risk_farms', v_at_risk_farms,
    'pending_decisions', v_pending_decisions,
    'high_expenses_today', v_high_expenses_today
  );

  RETURN v_result;
END;
$$;

-- دالة: تصنيف صحة المزارع (Farm Radar Categories)
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
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bf.id,
      'name', bf.name,
      'location', bf.location,
      'created_at', bf.created_at
    )
  )
  INTO v_newly_born
  FROM b2f_farms bf
  WHERE bf.created_at >= NOW() - INTERVAL '7 days'
  ORDER BY bf.created_at DESC
  LIMIT 10;

  -- مزارع بدون مدير (No Manager)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bf.id,
      'name', bf.name,
      'location', bf.location,
      'created_at', bf.created_at
    )
  )
  INTO v_no_manager
  FROM b2f_farms bf
  WHERE bf.operational_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM fc_operational_farms fof
      WHERE fof.reference_farm_id = bf.id
        AND fof.farm_manager_id IS NOT NULL
    )
  ORDER BY bf.created_at ASC
  LIMIT 10;

  -- مزارع متعثرة (At Risk): لديها مهام متأخرة
  WITH at_risk_farms AS (
    SELECT DISTINCT bf.id, bf.name, bf.location, bf.created_at,
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
    SELECT bf.id, bf.name, bf.location, bf.created_at
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

-- دالة: القائمة المختصرة (Top 10 Farms)
CREATE OR REPLACE FUNCTION get_farms_command_list(
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  farm_location text,
  operational_status text,
  manager_name text,
  last_activity timestamptz,
  pending_tasks_count int,
  overdue_tasks_count int,
  bookings_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bf.id as farm_id,
    bf.name as farm_name,
    bf.location as farm_location,
    bf.operational_status,
    ps.full_name as manager_name,
    (
      SELECT MAX(fat.created_at)
      FROM fc_activity_timeline fat
      WHERE fat.farm_id = bf.id
    ) as last_activity,
    (
      SELECT COUNT(*)::int
      FROM farm_tasks ft
      WHERE ft.farm_id = bf.id
        AND ft.status IN ('new', 'in_progress')
    ) as pending_tasks_count,
    (
      SELECT COUNT(*)::int
      FROM farm_tasks ft
      WHERE ft.farm_id = bf.id
        AND ft.status IN ('new', 'in_progress')
        AND ft.due_date < NOW()
    ) as overdue_tasks_count,
    bf.bookings_enabled
  FROM b2f_farms bf
  LEFT JOIN fc_operational_farms fof ON fof.reference_farm_id = bf.id
  LEFT JOIN platform_staff ps ON ps.id = fof.farm_manager_id
  ORDER BY
    CASE
      WHEN bf.operational_status = 'active' THEN 1
      WHEN bf.operational_status = 'setup' THEN 2
      ELSE 3
    END,
    bf.created_at DESC
  LIMIT p_limit;
END;
$$;

-- دالة: تعيين مدير مزرعة
CREATE OR REPLACE FUNCTION assign_farm_manager(
  p_farm_id uuid,
  p_manager_id uuid,
  p_assigned_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operational_farm_id uuid;
  v_farm_name text;
  v_manager_name text;
  v_result jsonb;
BEGIN
  -- الحصول على اسم المزرعة
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- الحصول على اسم المدير
  SELECT full_name INTO v_manager_name
  FROM platform_staff
  WHERE id = p_manager_id;

  IF v_manager_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Manager not found'
    );
  END IF;

  -- التحقق من وجود المزرعة التشغيلية
  SELECT id INTO v_operational_farm_id
  FROM fc_operational_farms
  WHERE reference_farm_id = p_farm_id;

  IF v_operational_farm_id IS NULL THEN
    -- إنشاء مزرعة تشغيلية جديدة
    INSERT INTO fc_operational_farms (
      reference_farm_id,
      farm_manager_id,
      created_at
    ) VALUES (
      p_farm_id,
      p_manager_id,
      NOW()
    )
    RETURNING id INTO v_operational_farm_id;
  ELSE
    -- تحديث المدير
    UPDATE fc_operational_farms
    SET farm_manager_id = p_manager_id,
        updated_at = NOW()
    WHERE id = v_operational_farm_id;
  END IF;

  -- تسجيل في Timeline
  INSERT INTO fc_activity_timeline (
    farm_id,
    event_type,
    description,
    actor_id,
    event_data,
    created_at
  ) VALUES (
    p_farm_id,
    'manager_assigned',
    'تم تعيين ' || v_manager_name || ' كمدير للمزرعة',
    p_assigned_by,
    jsonb_build_object(
      'manager_id', p_manager_id,
      'manager_name', v_manager_name,
      'reason', p_reason
    ),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'manager_id', p_manager_id,
    'manager_name', v_manager_name,
    'operational_farm_id', v_operational_farm_id
  );

  RETURN v_result;
END;
$$;

-- دالة: تعليق مزرعة مؤقتاً
CREATE OR REPLACE FUNCTION suspend_farm(
  p_farm_id uuid,
  p_suspended_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_result jsonb;
BEGIN
  -- الحصول على اسم المزرعة
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- تحديث الحالة
  UPDATE b2f_farms
  SET
    operational_status = 'suspended',
    suspended_at = NOW(),
    bookings_enabled = false
  WHERE id = p_farm_id;

  -- تسجيل في Executive Log
  INSERT INTO executive_logs (
    log_type,
    action,
    farm_id,
    executor_id,
    details,
    created_at
  ) VALUES (
    'farm_suspended',
    'suspend_farm',
    p_farm_id,
    p_suspended_by,
    jsonb_build_object(
      'farm_name', v_farm_name,
      'reason', p_reason,
      'suspended_at', NOW()
    ),
    NOW()
  );

  -- تسجيل في Timeline
  INSERT INTO fc_activity_timeline (
    farm_id,
    event_type,
    description,
    actor_id,
    event_data,
    created_at
  ) VALUES (
    p_farm_id,
    'farm_suspended',
    'تم تعليق المزرعة: ' || p_reason,
    p_suspended_by,
    jsonb_build_object('reason', p_reason),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'status', 'suspended'
  );

  RETURN v_result;
END;
$$;

-- دالة: فتح/إيقاف الحجوزات
CREATE OR REPLACE FUNCTION toggle_farm_bookings(
  p_farm_id uuid,
  p_enable boolean,
  p_toggled_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_result jsonb;
BEGIN
  -- الحصول على اسم المزرعة
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- تحديث حالة الحجوزات
  UPDATE b2f_farms
  SET bookings_enabled = p_enable
  WHERE id = p_farm_id;

  -- تسجيل في Timeline
  INSERT INTO fc_activity_timeline (
    farm_id,
    event_type,
    description,
    actor_id,
    event_data,
    created_at
  ) VALUES (
    p_farm_id,
    CASE WHEN p_enable THEN 'bookings_opened' ELSE 'bookings_closed' END,
    CASE WHEN p_enable THEN 'تم فتح الحجوزات' ELSE 'تم إيقاف الحجوزات' END,
    p_toggled_by,
    jsonb_build_object('reason', p_reason, 'enabled', p_enable),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'bookings_enabled', p_enable
  );

  RETURN v_result;
END;
$$;

-- دالة: رفع قرار مصروف كبير
CREATE OR REPLACE FUNCTION escalate_high_expense_decision(
  p_farm_id uuid,
  p_expense_amount numeric,
  p_expense_description text,
  p_requested_by uuid,
  p_priority text DEFAULT 'high'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_farm_name text;
  v_result jsonb;
BEGIN
  -- الحصول على اسم المزرعة
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- إنشاء قرار في قائمة الانتظار
  INSERT INTO b2f_decision_queue (
    decision_type,
    farm_id,
    priority,
    title,
    description,
    requested_by,
    action_data,
    status,
    created_at
  ) VALUES (
    'high_expense_approval',
    p_farm_id,
    p_priority,
    'اعتماد مصروف كبير: ' || p_expense_amount || ' ر.س',
    p_expense_description,
    p_requested_by,
    jsonb_build_object(
      'farm_name', v_farm_name,
      'expense_amount', p_expense_amount,
      'expense_description', p_expense_description
    ),
    'pending',
    NOW()
  )
  RETURNING id INTO v_decision_id;

  v_result := jsonb_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name
  );

  RETURN v_result;
END;
$$;