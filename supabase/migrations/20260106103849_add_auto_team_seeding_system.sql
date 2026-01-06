/*
  # Farm Command 2.0 - Phase 2: Auto Team Seeding System

  1. New Tables
    - `farm_positions` - Tracks vacant/assigned position seats in farm teams
      - Separate "position seat" from actual employee account
      - Auto-created when farm manager is assigned

  2. Enhanced Functions
    - `seed_farm_positions(p_farm_id, p_has_factory)` - Creates default position seats
    - `farm_command_assign_manager_v2()` - Enhanced assignment with auto team seed
    - `assign_staff_to_position()` - Assigns employee to vacant position
    - `get_farm_positions()` - Retrieves farm's position structure
    - `remove_staff_from_position()` - Removes employee from position

  3. Position Keys
    - field_supervisor (مشرف الحقل)
    - agri_engineer (مهندس زراعي)
    - technician (فني)
    - worker (عامل)
    - factory_supervisor (مشرف المصنع) - conditional on has_factory

  4. Security
    - RLS policies for farm_positions
    - Only GM and National Manager can assign managers
    - Farm managers can view their team positions
*/

-- ============================================
-- 1. CREATE farm_positions TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS farm_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  position_key text NOT NULL CHECK (position_key IN (
    'field_supervisor',
    'agri_engineer',
    'technician',
    'worker',
    'factory_supervisor'
  )),
  title_ar text NOT NULL,
  title_en text NOT NULL,
  status text NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'assigned')),
  assigned_staff_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  notes text,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(farm_id, position_key)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_farm_positions_farm_id ON farm_positions(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_positions_staff ON farm_positions(assigned_staff_id) WHERE assigned_staff_id IS NOT NULL;

-- ============================================
-- 2. RLS POLICIES FOR farm_positions
-- ============================================

ALTER TABLE farm_positions ENABLE ROW LEVEL SECURITY;

-- GM and National Manager can view all positions
CREATE POLICY "Admins can view all farm positions"
  ON farm_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id IN (
        SELECT unnest(string_to_array(current_setting('app.current_staff_id', true), ','))::uuid
      )
      AND role IN ('general_manager', 'مدير المزارع الوطني')
    )
  );

-- Farm managers can view their farm's positions
CREATE POLICY "Farm managers can view their farm positions"
  ON farm_positions FOR SELECT
  USING (
    farm_id IN (
      SELECT f.id FROM b2f_farms f
      INNER JOIN farm_team ft ON ft.farm_id = f.id
      WHERE ft.user_id IN (
        SELECT ps.user_id FROM platform_staff ps
        WHERE ps.id IN (
          SELECT unnest(string_to_array(current_setting('app.current_staff_id', true), ','))::uuid
        )
      )
      AND ft.is_active = true
    )
  );

-- Only admins can insert/update positions
CREATE POLICY "Admins can manage farm positions"
  ON farm_positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id IN (
        SELECT unnest(string_to_array(current_setting('app.current_staff_id', true), ','))::uuid
      )
      AND role IN ('general_manager', 'مدير المزارع الوطني')
    )
  );

-- ============================================
-- 3. FUNCTION: seed_farm_positions
-- ============================================

CREATE OR REPLACE FUNCTION seed_farm_positions(
  p_farm_id uuid,
  p_has_factory boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_positions_count integer := 0;
  v_factory_count integer := 0;
BEGIN
  -- Insert basic positions (4 positions)
  INSERT INTO farm_positions (farm_id, position_key, title_ar, title_en, status, is_required)
  VALUES
    (p_farm_id, 'field_supervisor', 'مشرف الحقل', 'Field Supervisor', 'vacant', true),
    (p_farm_id, 'agri_engineer', 'مهندس زراعي', 'Agricultural Engineer', 'vacant', true),
    (p_farm_id, 'technician', 'فني', 'Technician', 'vacant', true),
    (p_farm_id, 'worker', 'عامل', 'Worker', 'vacant', true)
  ON CONFLICT (farm_id, position_key) DO NOTHING;

  GET DIAGNOSTICS v_positions_count = ROW_COUNT;

  -- Add factory supervisor if farm has factory
  IF p_has_factory THEN
    INSERT INTO farm_positions (farm_id, position_key, title_ar, title_en, status, is_required)
    VALUES (p_farm_id, 'factory_supervisor', 'مشرف المصنع', 'Factory Supervisor', 'vacant', false)
    ON CONFLICT (farm_id, position_key) DO NOTHING;

    GET DIAGNOSTICS v_factory_count = ROW_COUNT;
    v_positions_count := v_positions_count + v_factory_count;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', 'تم إنشاء المقاعد الوظيفية بنجاح',
    'message_en', 'Position seats created successfully',
    'positions_created', v_positions_count,
    'farm_id', p_farm_id
  );
END;
$$;

-- ============================================
-- 4. FUNCTION: farm_command_assign_manager_v2
-- ============================================

CREATE OR REPLACE FUNCTION farm_command_assign_manager_v2(
  p_user_id uuid,
  p_farm_id uuid,
  p_new_manager_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_old_manager_id uuid;
  v_farm_name text;
  v_farm_has_factory boolean := false;
  v_seed_result jsonb;
  v_manager_user_id uuid;
BEGIN
  -- Check permissions
  SELECT role INTO v_user_role
  FROM platform_staff
  WHERE id = p_user_id;

  IF v_user_role NOT IN ('general_manager', 'مدير المزارع الوطني') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'غير مصرح لك بتعيين مدير المزرعة',
      'message_en', 'Not authorized to assign farm manager'
    );
  END IF;

  -- Get manager's user_id
  SELECT user_id INTO v_manager_user_id
  FROM platform_staff
  WHERE id = p_new_manager_id;

  IF v_manager_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المدير المختار غير مرتبط بحساب مستخدم',
      'message_en', 'Selected manager has no linked user account'
    );
  END IF;

  -- Get farm details
  SELECT name, has_factory, farm_manager_id
  INTO v_farm_name, v_farm_has_factory, v_old_manager_id
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المزرعة غير موجودة',
      'message_en', 'Farm not found'
    );
  END IF;

  -- 1. Deactivate old manager in farm_team (if exists)
  IF v_old_manager_id IS NOT NULL THEN
    UPDATE farm_team
    SET
      is_active = false,
      updated_at = now()
    WHERE farm_id = p_farm_id
      AND role = 'farm_manager'
      AND is_active = true;
  END IF;

  -- 2. Update farm with new manager
  UPDATE b2f_farms
  SET
    farm_manager_id = p_new_manager_id,
    updated_at = now()
  WHERE id = p_farm_id;

  -- 3. Add new manager to farm_team
  INSERT INTO farm_team (farm_id, user_id, role, is_active)
  VALUES (p_farm_id, v_manager_user_id, 'farm_manager', true)
  ON CONFLICT (farm_id, user_id, role)
  DO UPDATE SET is_active = true, updated_at = now();

  -- 4. Auto-create position seats (NEW!)
  SELECT seed_farm_positions(p_farm_id, v_farm_has_factory)
  INTO v_seed_result;

  -- 5. Log the operation
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    performed_by
  ) VALUES (
    'assign_farm_manager',
    'b2f_farms',
    p_farm_id,
    jsonb_build_object('old_manager_id', v_old_manager_id),
    jsonb_build_object(
      'new_manager_id', p_new_manager_id,
      'positions_created', v_seed_result->'positions_created'
    ),
    p_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', 'تم تعيين مدير المزرعة وإنشاء الفريق بنجاح',
    'message_en', 'Farm manager assigned and team created successfully',
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'new_manager_id', p_new_manager_id,
    'old_manager_id', v_old_manager_id,
    'team_seed_result', v_seed_result
  );
END;
$$;

-- ============================================
-- 5. FUNCTION: get_farm_positions
-- ============================================

CREATE OR REPLACE FUNCTION get_farm_positions(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', fp.id,
      'position_key', fp.position_key,
      'title_ar', fp.title_ar,
      'title_en', fp.title_en,
      'status', fp.status,
      'is_required', fp.is_required,
      'assigned_staff_id', fp.assigned_staff_id,
      'assigned_staff_name', ps.name,
      'assigned_staff_code', ps.staff_code,
      'assigned_at', fp.assigned_at,
      'notes', fp.notes,
      'created_at', fp.created_at
    )
    ORDER BY
      CASE fp.position_key
        WHEN 'field_supervisor' THEN 1
        WHEN 'agri_engineer' THEN 2
        WHEN 'technician' THEN 3
        WHEN 'worker' THEN 4
        WHEN 'factory_supervisor' THEN 5
        ELSE 6
      END
  )
  INTO v_result
  FROM farm_positions fp
  LEFT JOIN platform_staff ps ON ps.id = fp.assigned_staff_id
  WHERE fp.farm_id = p_farm_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================
-- 6. FUNCTION: assign_staff_to_position
-- ============================================

CREATE OR REPLACE FUNCTION assign_staff_to_position(
  p_position_id uuid,
  p_staff_id uuid,
  p_assigned_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position_status text;
  v_farm_id uuid;
  v_staff_user_id uuid;
BEGIN
  -- Check if position exists and is vacant
  SELECT status, farm_id
  INTO v_position_status, v_farm_id
  FROM farm_positions
  WHERE id = p_position_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المقعد الوظيفي غير موجود',
      'message_en', 'Position not found'
    );
  END IF;

  IF v_position_status = 'assigned' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المقعد محجوز بالفعل',
      'message_en', 'Position already assigned'
    );
  END IF;

  -- Get staff user_id
  SELECT user_id INTO v_staff_user_id
  FROM platform_staff
  WHERE id = p_staff_id;

  -- Assign staff to position
  UPDATE farm_positions
  SET
    assigned_staff_id = p_staff_id,
    status = 'assigned',
    assigned_at = now(),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_position_id;

  -- Add to farm_team if not already there and has user_id
  IF v_staff_user_id IS NOT NULL THEN
    INSERT INTO farm_team (farm_id, user_id, role, is_active)
    SELECT v_farm_id, v_staff_user_id, 'team_member', true
    WHERE NOT EXISTS (
      SELECT 1 FROM farm_team
      WHERE farm_id = v_farm_id AND user_id = v_staff_user_id
    );
  END IF;

  -- Log the operation
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    new_values,
    performed_by
  ) VALUES (
    'assign_staff_to_position',
    'farm_positions',
    p_position_id,
    jsonb_build_object('staff_id', p_staff_id, 'notes', p_notes),
    p_assigned_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', 'تم تعيين الموظف بنجاح',
    'message_en', 'Staff assigned successfully',
    'position_id', p_position_id,
    'staff_id', p_staff_id
  );
END;
$$;

-- ============================================
-- 7. FUNCTION: remove_staff_from_position
-- ============================================

CREATE OR REPLACE FUNCTION remove_staff_from_position(
  p_position_id uuid,
  p_removed_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_staff_id uuid;
BEGIN
  -- Get current staff assignment
  SELECT assigned_staff_id
  INTO v_old_staff_id
  FROM farm_positions
  WHERE id = p_position_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المقعد الوظيفي غير موجود',
      'message_en', 'Position not found'
    );
  END IF;

  IF v_old_staff_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المقعد فارغ بالفعل',
      'message_en', 'Position already vacant'
    );
  END IF;

  -- Remove staff from position
  UPDATE farm_positions
  SET
    assigned_staff_id = NULL,
    status = 'vacant',
    assigned_at = NULL,
    notes = COALESCE(p_reason, notes),
    updated_at = now()
  WHERE id = p_position_id;

  -- Log the operation
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    old_values,
    performed_by
  ) VALUES (
    'remove_staff_from_position',
    'farm_positions',
    p_position_id,
    jsonb_build_object('staff_id', v_old_staff_id, 'reason', p_reason),
    p_removed_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', 'تم إزالة الموظف من المقعد بنجاح',
    'message_en', 'Staff removed from position successfully',
    'position_id', p_position_id,
    'removed_staff_id', v_old_staff_id
  );
END;
$$;

-- ============================================
-- 8. GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION seed_farm_positions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION farm_command_assign_manager_v2 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_farm_positions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION assign_staff_to_position TO authenticated, anon;
GRANT EXECUTE ON FUNCTION remove_staff_from_position TO authenticated, anon;
