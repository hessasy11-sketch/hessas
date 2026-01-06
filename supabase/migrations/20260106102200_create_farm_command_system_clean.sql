/*
  # Farm Command 2.0 - غرفة عمليات قيادة المزارع
  
  ## الوصف
  مركز تحكم متكامل للمدير العام ومدير المزارع الوطني لمتابعة كل المزارع وإدارة العمليات التشغيلية.
  
  ## الدوال الجديدة (مع بادئة farm_command_)
  
  1. can_access_farm_command - صلاحيات الوصول
  2. farm_command_get_kpis - 6 مؤشرات رئيسية
  3. farm_command_get_farms_list - قائمة المزارع الشاملة  
  4. farm_command_get_overdue_tasks - المهام المتأخرة
  5. farm_command_get_pending_expenses - المصروفات المعلقة
  6. farm_command_get_pending_visits - طلبات الزيارة
  7. farm_command_assign_manager - تعيين مدير مزرعة
  8. farm_command_suspend_bookings - تعليق الحجوزات (GM فقط)
*/

-- =====================================================
-- 1) دالة التحقق من صلاحيات Farm Command
-- =====================================================

CREATE OR REPLACE FUNCTION can_access_farm_command(
  p_user_id uuid,
  p_access_level text DEFAULT 'full'
) RETURNS boolean AS $$
DECLARE
  v_staff_role text;
  v_department text;
BEGIN
  SELECT role, department INTO v_staff_role, v_department
  FROM platform_staff
  WHERE user_id = p_user_id OR id = p_user_id
  LIMIT 1;
  
  IF v_staff_role = 'general_manager' THEN
    RETURN true;
  END IF;
  
  IF v_staff_role = 'مدير_المزارع_الوطني' THEN
    RETURN true;
  END IF;
  
  IF v_department = 'finance' AND p_access_level = 'finance_only' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2) دالة KPIs الرئيسية
-- =====================================================

CREATE OR REPLACE FUNCTION farm_command_get_kpis(
  p_user_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_can_access boolean;
  v_result jsonb;
  v_active_farms integer;
  v_ready_farms integer;
  v_farms_with_overdue integer;
  v_pending_expenses integer;
  v_pending_visits integer;
  v_pending_decisions integer;
BEGIN
  SELECT can_access_farm_command(p_user_id, 'full') INTO v_can_access;
  
  IF NOT v_can_access THEN
    RETURN jsonb_build_object(
      'error', 'Access denied',
      'message_ar', 'ليس لديك صلاحية الوصول إلى غرفة العمليات'
    );
  END IF;
  
  SELECT COUNT(*) INTO v_active_farms
  FROM b2f_farms
  WHERE operational_status = 'active';
  
  SELECT COUNT(*) INTO v_ready_farms
  FROM b2f_farms f
  WHERE f.operational_status = 'ready'
    AND EXISTS (
      SELECT 1 FROM b2f_contracts c
      WHERE c.farm_id = f.id AND c.status = 'active'
    );
  
  SELECT COUNT(DISTINCT farm_id) INTO v_farms_with_overdue
  FROM farm_tasks
  WHERE status IN ('pending', 'in_progress')
    AND due_date < CURRENT_DATE;
  
  SELECT COUNT(*) INTO v_pending_expenses
  FROM farm_expenses
  WHERE approval_status = 'pending';
  
  SELECT COUNT(*) INTO v_pending_visits
  FROM farm_visit_requests
  WHERE status = 'pending';
  
  SELECT COUNT(*) INTO v_pending_decisions
  FROM decision_queue
  WHERE status = 'pending' AND section = 'b2f';
  
  v_result := jsonb_build_object(
    'active_farms', v_active_farms,
    'ready_to_activate', v_ready_farms,
    'farms_with_overdue_tasks', v_farms_with_overdue,
    'pending_expenses', v_pending_expenses,
    'pending_visits', v_pending_visits,
    'pending_decisions', v_pending_decisions,
    'timestamp', now()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3) دالة قائمة المزارع الشاملة
-- =====================================================

CREATE OR REPLACE FUNCTION farm_command_get_farms_list(
  p_user_id uuid,
  p_status_filter text DEFAULT NULL,
  p_manager_filter uuid DEFAULT NULL,
  p_has_delays boolean DEFAULT NULL,
  p_has_pending_expenses boolean DEFAULT NULL,
  p_search_query text DEFAULT NULL
) RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  farm_name_ar text,
  operational_status text,
  manager_id uuid,
  manager_name text,
  open_tasks_count integer,
  overdue_tasks_count integer,
  pending_expenses_count integer,
  pending_expenses_amount numeric,
  last_activity timestamp with time zone,
  created_at timestamp with time zone
) AS $$
BEGIN
  IF NOT can_access_farm_command(p_user_id, 'full') THEN
    RAISE EXCEPTION 'Access denied to Farm Command';
  END IF;
  
  RETURN QUERY
  SELECT 
    f.id AS farm_id,
    f.name AS farm_name,
    f.name_ar AS farm_name_ar,
    f.operational_status,
    fm.user_id AS manager_id,
    ps.full_name AS manager_name,
    
    COALESCE((
      SELECT COUNT(*)::integer FROM farm_tasks ft
      WHERE ft.farm_id = f.id AND ft.status IN ('pending', 'in_progress')
    ), 0) AS open_tasks_count,
    
    COALESCE((
      SELECT COUNT(*)::integer FROM farm_tasks ft
      WHERE ft.farm_id = f.id 
        AND ft.status IN ('pending', 'in_progress')
        AND ft.due_date < CURRENT_DATE
    ), 0) AS overdue_tasks_count,
    
    COALESCE((
      SELECT COUNT(*)::integer FROM farm_expenses fe
      WHERE fe.farm_id = f.id AND fe.approval_status = 'pending'
    ), 0) AS pending_expenses_count,
    
    COALESCE((
      SELECT SUM(fe.amount) FROM farm_expenses fe
      WHERE fe.farm_id = f.id AND fe.approval_status = 'pending'
    ), 0) AS pending_expenses_amount,
    
    GREATEST(
      f.updated_at,
      COALESCE((SELECT MAX(created_at) FROM farm_tasks WHERE farm_id = f.id), f.created_at),
      COALESCE((SELECT MAX(created_at) FROM farm_expenses WHERE farm_id = f.id), f.created_at)
    ) AS last_activity,
    
    f.created_at
    
  FROM b2f_farms f
  LEFT JOIN farm_team fm ON f.id = fm.farm_id AND fm.role = 'farm_manager' AND fm.is_active = true
  LEFT JOIN platform_staff ps ON fm.user_id = ps.user_id OR fm.user_id = ps.id
  
  WHERE 
    (p_status_filter IS NULL OR f.operational_status = p_status_filter)
    AND (p_manager_filter IS NULL OR fm.user_id = p_manager_filter)
    AND (p_has_delays IS NULL OR (
      p_has_delays = true AND EXISTS (
        SELECT 1 FROM farm_tasks ft
        WHERE ft.farm_id = f.id
          AND ft.status IN ('pending', 'in_progress')
          AND ft.due_date < CURRENT_DATE
      )
    ))
    AND (p_has_pending_expenses IS NULL OR (
      p_has_pending_expenses = true AND EXISTS (
        SELECT 1 FROM farm_expenses fe
        WHERE fe.farm_id = f.id AND fe.approval_status = 'pending'
      )
    ))
    AND (p_search_query IS NULL OR (
      f.name ILIKE '%' || p_search_query || '%' OR
      f.name_ar ILIKE '%' || p_search_query || '%'
    ))
  
  ORDER BY 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM farm_tasks ft
        WHERE ft.farm_id = f.id
          AND ft.status IN ('pending', 'in_progress')
          AND ft.due_date < CURRENT_DATE
      ) THEN 1
      ELSE 2
    END,
    last_activity DESC;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4) دالة المهام المتأخرة
-- =====================================================

CREATE OR REPLACE FUNCTION farm_command_get_overdue_tasks(
  p_user_id uuid,
  p_limit integer DEFAULT 20
) RETURNS TABLE (
  task_id uuid,
  task_title text,
  task_description text,
  farm_id uuid,
  farm_name text,
  farm_name_ar text,
  assigned_to uuid,
  assigned_to_name text,
  due_date date,
  days_overdue integer,
  priority text,
  status text
) AS $$
BEGIN
  IF NOT can_access_farm_command(p_user_id, 'full') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    ft.id AS task_id,
    ft.title AS task_title,
    ft.description AS task_description,
    f.id AS farm_id,
    f.name AS farm_name,
    f.name_ar AS farm_name_ar,
    ft.assigned_to,
    ps.full_name AS assigned_to_name,
    ft.due_date,
    (CURRENT_DATE - ft.due_date)::integer AS days_overdue,
    ft.priority,
    ft.status
  FROM farm_tasks ft
  INNER JOIN b2f_farms f ON ft.farm_id = f.id
  LEFT JOIN platform_staff ps ON ft.assigned_to = ps.user_id OR ft.assigned_to = ps.id
  WHERE ft.status IN ('pending', 'in_progress')
    AND ft.due_date < CURRENT_DATE
  ORDER BY 
    ft.due_date ASC,
    CASE ft.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      ELSE 4
    END
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5) دالة المصروفات المعلقة
-- =====================================================

CREATE OR REPLACE FUNCTION farm_command_get_pending_expenses(
  p_user_id uuid,
  p_limit integer DEFAULT 20
) RETURNS TABLE (
  expense_id uuid,
  farm_id uuid,
  farm_name text,
  farm_name_ar text,
  category text,
  description text,
  amount numeric,
  requested_by uuid,
  requested_by_name text,
  requested_at timestamp with time zone,
  days_pending integer
) AS $$
BEGIN
  IF NOT (can_access_farm_command(p_user_id, 'full') OR 
          can_access_farm_command(p_user_id, 'finance_only')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    fe.id AS expense_id,
    f.id AS farm_id,
    f.name AS farm_name,
    f.name_ar AS farm_name_ar,
    fe.category,
    fe.description,
    fe.amount,
    fe.requested_by,
    ps.full_name AS requested_by_name,
    fe.created_at AS requested_at,
    (CURRENT_DATE - fe.created_at::date)::integer AS days_pending
  FROM farm_expenses fe
  INNER JOIN b2f_farms f ON fe.farm_id = f.id
  LEFT JOIN platform_staff ps ON fe.requested_by = ps.user_id OR fe.requested_by = ps.id
  WHERE fe.approval_status = 'pending'
  ORDER BY fe.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6) دالة طلبات الزيارة المعلقة
-- =====================================================

CREATE OR REPLACE FUNCTION farm_command_get_pending_visits(
  p_user_id uuid
) RETURNS TABLE (
  visit_id uuid,
  farm_id uuid,
  farm_name text,
  farm_name_ar text,
  visitor_name text,
  visitor_phone text,
  preferred_date date,
  reason text,
  requested_at timestamp with time zone,
  days_pending integer
) AS $$
BEGIN
  IF NOT can_access_farm_command(p_user_id, 'full') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    fvr.id AS visit_id,
    f.id AS farm_id,
    f.name AS farm_name,
    f.name_ar AS farm_name_ar,
    fvr.visitor_name,
    fvr.visitor_phone,
    fvr.preferred_date,
    fvr.reason,
    fvr.created_at AS requested_at,
    (CURRENT_DATE - fvr.created_at::date)::integer AS days_pending
  FROM farm_visit_requests fvr
  INNER JOIN b2f_farms f ON fvr.farm_id = f.id
  WHERE fvr.status = 'pending'
  ORDER BY fvr.preferred_date ASC, fvr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7) دالة تعيين مدير مزرعة
-- =====================================================

CREATE OR REPLACE FUNCTION farm_command_assign_manager(
  p_user_id uuid,
  p_farm_id uuid,
  p_new_manager_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_can_access boolean;
  v_old_manager_id uuid;
  v_result jsonb;
BEGIN
  SELECT can_access_farm_command(p_user_id, 'full') INTO v_can_access;
  
  IF NOT v_can_access THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied',
      'message_ar', 'ليس لديك صلاحية تعيين مدراء المزارع'
    );
  END IF;
  
  SELECT user_id INTO v_old_manager_id
  FROM farm_team
  WHERE farm_id = p_farm_id
    AND role = 'farm_manager'
    AND is_active = true
  LIMIT 1;
  
  IF v_old_manager_id IS NOT NULL THEN
    UPDATE farm_team
    SET is_active = false
    WHERE farm_id = p_farm_id
      AND user_id = v_old_manager_id
      AND role = 'farm_manager';
  END IF;
  
  INSERT INTO farm_team (farm_id, user_id, role, is_active)
  VALUES (p_farm_id, p_new_manager_id, 'farm_manager', true)
  ON CONFLICT (farm_id, user_id, role) 
  DO UPDATE SET is_active = true;
  
  INSERT INTO audit_logs (
    action, table_name, record_id, old_values, new_values, performed_by
  ) VALUES (
    'assign_farm_manager', 'farm_team', p_farm_id,
    jsonb_build_object('old_manager', v_old_manager_id),
    jsonb_build_object('new_manager', p_new_manager_id),
    p_user_id
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'message_ar', 'تم تعيين مدير المزرعة بنجاح',
    'old_manager', v_old_manager_id,
    'new_manager', p_new_manager_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8) دالة تعليق الحجوزات (GM فقط)
-- =====================================================

CREATE OR REPLACE FUNCTION farm_command_suspend_bookings(
  p_user_id uuid,
  p_farm_id uuid,
  p_reason text
) RETURNS jsonb AS $$
DECLARE
  v_staff_role text;
  v_affected_count integer;
  v_result jsonb;
BEGIN
  SELECT role INTO v_staff_role
  FROM platform_staff
  WHERE user_id = p_user_id OR id = p_user_id
  LIMIT 1;
  
  IF v_staff_role != 'general_manager' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized',
      'message_ar', 'هذه العملية متاحة للمدير العام فقط'
    );
  END IF;
  
  UPDATE b2f_sales_requests
  SET 
    status = 'suspended',
    admin_notes = COALESCE(admin_notes || E'\n', '') || 
                  'تم التعليق بواسطة GM: ' || p_reason || ' في ' || now()::text
  WHERE farm_id = p_farm_id
    AND status IN ('pending', 'payment_review', 'approved_pending_payment');
  
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  
  UPDATE b2f_farms
  SET operational_status = 'suspended'
  WHERE id = p_farm_id;
  
  INSERT INTO audit_logs (
    action, table_name, record_id, new_values, performed_by
  ) VALUES (
    'suspend_farm_bookings', 'b2f_farms', p_farm_id,
    jsonb_build_object('reason', p_reason, 'affected_bookings', v_affected_count),
    p_user_id
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'message_ar', 'تم تعليق الحجوزات بنجاح',
    'affected_bookings', v_affected_count
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS Policies
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'b2f_farms' AND policyname = 'farm_command_read_all'
  ) THEN
    CREATE POLICY farm_command_read_all ON b2f_farms FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM platform_staff
        WHERE (user_id = auth.uid() OR id = auth.uid())
          AND role IN ('general_manager', 'مدير_المزارع_الوطني')
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'farm_tasks' AND policyname = 'farm_command_read_tasks'
  ) THEN
    CREATE POLICY farm_command_read_tasks ON farm_tasks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM platform_staff
        WHERE (user_id = auth.uid() OR id = auth.uid())
          AND role IN ('general_manager', 'مدير_المزارع_الوطني')
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'farm_expenses' AND policyname = 'farm_command_read_expenses'
  ) THEN
    CREATE POLICY farm_command_read_expenses ON farm_expenses FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM platform_staff
        WHERE (user_id = auth.uid() OR id = auth.uid())
          AND (
            role IN ('general_manager', 'مدير_المزارع_الوطني')
            OR department = 'finance'
          )
      )
    );
  END IF;
END $$;

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_farm_tasks_farm_status 
ON farm_tasks(farm_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_farm_expenses_farm_approval 
ON farm_expenses(farm_id, approval_status, created_at);

CREATE INDEX IF NOT EXISTS idx_farm_visits_farm_status 
ON farm_visit_requests(farm_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_farms_operational_status 
ON b2f_farms(operational_status, updated_at);

CREATE INDEX IF NOT EXISTS idx_farm_team_farm_role 
ON farm_team(farm_id, role, is_active);
