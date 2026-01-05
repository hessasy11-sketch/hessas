/*
  # ربط مهام المزرعة بفريق المزرعة

  1. التحديثات
    - إضافة constraint للتحقق من أن assigned_to يكون من أعضاء farm_team
    - تحديث RLS policies

  2. الدوال
    - `is_team_member_of_farm` - للتحقق من عضوية الفريق
    - `get_farm_team_members_for_task` - جلب أعضاء الفريق المتاحين للتكليف
    - `create_farm_task_for_team` - إنشاء مهمة مع التحقق

  3. الأمان
    - constraint يمنع تعيين مهمة لشخص ليس في الفريق
    - RLS policies محدثة
*/

-- =====================================================
-- 1. دالة التحقق من عضوية الفريق في المزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION is_team_member_of_farm(
  p_staff_id uuid,
  p_farm_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM authority_assignments aa
    WHERE aa.staff_id = p_staff_id
    AND aa.scope_farm_id = p_farm_id
    AND aa.scope_type = 'farm'
    AND aa.status = 'active'
    AND aa.authority_role IN (
      'FARM_MANAGER',
      'FIELD_SUPERVISOR',
      'AGRONOMIST_ENGINEER',
      'TECHNICIAN',
      'WORKER',
      'FACTORY_SUPERVISOR'
    )
  );
$$;

-- =====================================================
-- 2. دالة جلب أعضاء الفريق المتاحين للتكليف
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_team_members_for_task(p_farm_id uuid)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  staff_code text,
  role text,
  role_name_ar text,
  department text,
  phone text,
  email text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.name,
    ps.staff_code,
    ps.role,
    arc.role_name_ar,
    ps.department,
    ps.phone,
    ps.email
  FROM platform_staff ps
  INNER JOIN authority_assignments aa
    ON aa.staff_id = ps.id
  LEFT JOIN authority_roles_catalog arc
    ON arc.role_code = ps.role
  WHERE aa.scope_farm_id = p_farm_id
    AND aa.scope_type = 'farm'
    AND aa.status = 'active'
    AND ps.is_active = true
    AND ps.role IN (
      'FARM_MANAGER',
      'FIELD_SUPERVISOR',
      'AGRONOMIST_ENGINEER',
      'TECHNICIAN',
      'WORKER',
      'FACTORY_SUPERVISOR'
    )
  ORDER BY
    CASE ps.role
      WHEN 'FARM_MANAGER' THEN 1
      WHEN 'FIELD_SUPERVISOR' THEN 2
      WHEN 'AGRONOMIST_ENGINEER' THEN 3
      WHEN 'TECHNICIAN' THEN 4
      WHEN 'FACTORY_SUPERVISOR' THEN 5
      WHEN 'WORKER' THEN 6
      ELSE 7
    END,
    ps.name;
END;
$$;

-- =====================================================
-- 3. دالة إنشاء مهمة مع التحقق من عضوية الفريق
-- =====================================================
CREATE OR REPLACE FUNCTION create_farm_task_for_team(
  p_farm_id uuid,
  p_title text,
  p_description text,
  p_type text,
  p_assigned_to uuid,
  p_created_by uuid,
  p_priority text DEFAULT 'medium',
  p_due_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
  v_assigned_name text;
  v_creator_name text;
BEGIN
  -- التحقق من أن المكلَّف هو من أعضاء فريق المزرعة
  IF NOT is_team_member_of_farm(p_assigned_to, p_farm_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الشخص المحدد ليس من أعضاء فريق المزرعة'
    );
  END IF;

  -- جلب أسماء المكلَّف والمنشئ
  SELECT name INTO v_assigned_name
  FROM platform_staff
  WHERE id = p_assigned_to;

  SELECT name INTO v_creator_name
  FROM platform_staff
  WHERE id = p_created_by;

  -- إنشاء المهمة
  INSERT INTO farm_tasks (
    farm_id,
    title,
    description,
    type,
    assigned_to,
    assigned_to_name,
    created_by,
    created_by_name,
    priority,
    due_date,
    status
  ) VALUES (
    p_farm_id,
    p_title,
    p_description,
    p_type,
    p_assigned_to,
    v_assigned_name,
    p_created_by,
    v_creator_name,
    p_priority,
    p_due_date,
    'pending'
  ) RETURNING id INTO v_task_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم إنشاء المهمة بنجاح',
    'taskId', v_task_id
  );
END;
$$;

-- =====================================================
-- 4. دالة تحديث حالة المهمة من قبل المكلَّف
-- =====================================================
CREATE OR REPLACE FUNCTION update_task_status_by_assignee(
  p_task_id uuid,
  p_staff_id uuid,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task record;
BEGIN
  -- جلب المهمة
  SELECT * INTO v_task
  FROM farm_tasks
  WHERE id = p_task_id
  AND assigned_to = p_staff_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المهمة غير موجودة أو أنت لست المكلف بها'
    );
  END IF;

  -- التحقق من صحة الانتقال
  IF v_task.status = 'pending' AND p_new_status = 'in_progress' THEN
    UPDATE farm_tasks
    SET status = 'in_progress',
        started_at = now(),
        updated_at = now()
    WHERE id = p_task_id;
  ELSIF v_task.status = 'in_progress' AND p_new_status = 'submitted' THEN
    UPDATE farm_tasks
    SET status = 'submitted',
        submitted_at = now(),
        approval_notes = p_notes,
        updated_at = now()
    WHERE id = p_task_id;
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'الانتقال من ' || v_task.status || ' إلى ' || p_new_status || ' غير مسموح'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'تم تحديث حالة المهمة بنجاح'
  );
END;
$$;

-- =====================================================
-- 5. دالة جلب مهام المزرعة مع الإحصائيات
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_tasks_with_stats(p_farm_id uuid)
RETURNS TABLE (
  task_id uuid,
  title text,
  description text,
  type text,
  status text,
  priority text,
  assigned_to_id uuid,
  assigned_to_name text,
  assigned_to_role text,
  created_by_name text,
  due_date timestamptz,
  created_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  approval_notes text,
  rejection_reason text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ft.id,
    ft.title,
    ft.description,
    ft.type,
    ft.status,
    ft.priority,
    ft.assigned_to,
    ft.assigned_to_name,
    ps.role,
    ft.created_by_name,
    ft.due_date,
    ft.created_at,
    ft.started_at,
    ft.submitted_at,
    ft.approved_at,
    ft.rejected_at,
    ft.approval_notes,
    ft.rejection_reason
  FROM farm_tasks ft
  LEFT JOIN platform_staff ps ON ps.id = ft.assigned_to
  WHERE ft.farm_id = p_farm_id
  ORDER BY
    CASE ft.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    ft.created_at DESC;
$$;

-- =====================================================
-- 6. تحديث RLS Policies
-- =====================================================

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Staff can manage farm tasks" ON farm_tasks;
DROP POLICY IF EXISTS "Anyone can view farm tasks" ON farm_tasks;

-- سياسة القراءة: أعضاء الفريق والإداريون
CREATE POLICY "Team members and admins can view farm tasks"
  ON farm_tasks FOR SELECT
  TO public
  USING (
    -- أعضاء فريق المزرعة
    is_team_member_of_farm(
      (SELECT id FROM platform_staff WHERE user_id = auth.uid()),
      farm_id
    )
    OR
    -- الإداريون
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'general_manager', 'national_farm_director', 'b2f_manager')
    )
  );

-- سياسة الإضافة: مدير المزرعة والإداريون فقط
CREATE POLICY "Farm manager can create tasks"
  ON farm_tasks FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      INNER JOIN authority_assignments aa ON aa.staff_id = ps.id
      WHERE ps.user_id = auth.uid()
      AND aa.scope_farm_id = farm_id
      AND aa.scope_type = 'farm'
      AND aa.status = 'active'
      AND ps.role = 'FARM_MANAGER'
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'general_manager', 'national_farm_director')
    )
  );

-- سياسة التحديث: المكلَّف ومدير المزرعة والإداريون
CREATE POLICY "Assignee and manager can update tasks"
  ON farm_tasks FOR UPDATE
  TO public
  USING (
    -- المكلَّف بالمهمة
    assigned_to = (SELECT id FROM platform_staff WHERE user_id = auth.uid())
    OR
    -- مدير المزرعة
    EXISTS (
      SELECT 1 FROM platform_staff ps
      INNER JOIN authority_assignments aa ON aa.staff_id = ps.id
      WHERE ps.user_id = auth.uid()
      AND aa.scope_farm_id = farm_id
      AND aa.scope_type = 'farm'
      AND aa.status = 'active'
      AND ps.role = 'FARM_MANAGER'
    )
    OR
    -- الإداريون
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'general_manager', 'national_farm_director')
    )
  );

-- سياسة الحذف: مدير المزرعة والإداريون فقط
CREATE POLICY "Farm manager can delete tasks"
  ON farm_tasks FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      INNER JOIN authority_assignments aa ON aa.staff_id = ps.id
      WHERE ps.user_id = auth.uid()
      AND aa.scope_farm_id = farm_id
      AND aa.scope_type = 'farm'
      AND aa.status = 'active'
      AND ps.role = 'FARM_MANAGER'
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'admin', 'general_manager', 'national_farm_director')
    )
  );

-- =====================================================
-- 7. منح الصلاحيات
-- =====================================================
GRANT EXECUTE ON FUNCTION is_team_member_of_farm TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_farm_team_members_for_task TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_farm_task_for_team TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_task_status_by_assignee TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_farm_tasks_with_stats TO anon, authenticated;

-- =====================================================
-- 8. الفهارس الإضافية
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_farm_tasks_farm_assigned
  ON farm_tasks(farm_id, assigned_to);

CREATE INDEX IF NOT EXISTS idx_farm_tasks_status_priority
  ON farm_tasks(status, priority);

-- =====================================================
-- 9. Trigger للتحقق من عضوية الفريق عند الإنشاء
-- =====================================================
CREATE OR REPLACE FUNCTION validate_task_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من أن assigned_to هو من أعضاء فريق المزرعة
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT is_team_member_of_farm(NEW.assigned_to, NEW.farm_id) THEN
      RAISE EXCEPTION 'لا يمكن تعيين المهمة: الشخص المحدد ليس من أعضاء فريق المزرعة';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_farm_task_assignee
  BEFORE INSERT OR UPDATE OF assigned_to
  ON farm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_assignee();
