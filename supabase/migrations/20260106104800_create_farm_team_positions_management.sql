/*
  # Farm Team Positions Management System
  
  ## الهدف
  تمكين مدراء المزارع من ملء المقاعد الوظيفية بتعيين موظفين أو طلب إنشاء حسابات جديدة
  
  ## الجداول الجديدة
  
  1. `staff_requests` - طلبات إنشاء حسابات موظفين جدد
     - لما مدير المزرعة يحتاج موظف جديد لمقعد معين
     - الطلب يروح للـ GM/HR للموافقة
  
  ## الدوال الجديدة
  
  1. `get_available_staff_for_position` - جلب الموظفين المتاحين لمقعد معين
  2. `assign_existing_staff_to_position` - تعيين موظف موجود لمقعد
  3. `create_staff_request` - إنشاء طلب موظف جديد
  4. `get_farm_staff_requests` - جلب طلبات المزرعة
  5. `approve_staff_request` - موافقة GM على طلب
  
  ## الصلاحيات
  - GM: كل شيء
  - مدير المزارع الوطني: كل شيء
  - مدير المزرعة: فقط داخل مزرعته
  - بقية الفريق: قراءة فقط
*/

-- ============================================
-- 1. CREATE staff_requests TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS staff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES farm_positions(id) ON DELETE CASCADE,
  requested_role text NOT NULL,
  position_title_ar text NOT NULL,
  position_title_en text NOT NULL,
  requested_by_staff_id uuid NOT NULL REFERENCES platform_staff(id),
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES platform_staff(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_staff_requests_farm ON staff_requests(farm_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_requests_position ON staff_requests(position_id);
CREATE INDEX IF NOT EXISTS idx_staff_requests_status ON staff_requests(status, created_at);

-- ============================================
-- 2. RLS POLICIES FOR staff_requests
-- ============================================

ALTER TABLE staff_requests ENABLE ROW LEVEL SECURITY;

-- GM and National Manager can see all requests
CREATE POLICY "Admins can view all staff requests"
  ON staff_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id IN (
        SELECT unnest(string_to_array(current_setting('app.current_staff_id', true), ','))::uuid
      )
      AND role IN ('general_manager', 'مدير المزارع الوطني')
    )
  );

-- Farm managers can view their farm's requests
CREATE POLICY "Farm managers can view their requests"
  ON staff_requests FOR SELECT
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

-- Farm managers can create requests for their farm
CREATE POLICY "Farm managers can create requests"
  ON staff_requests FOR INSERT
  WITH CHECK (
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

-- Only admins can update/approve requests
CREATE POLICY "Admins can update staff requests"
  ON staff_requests FOR UPDATE
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
-- 3. FUNCTION: get_available_staff_for_position
-- ============================================

CREATE OR REPLACE FUNCTION get_available_staff_for_position(
  p_farm_id uuid,
  p_position_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Get staff members who:
  -- 1. Are not already assigned to this position
  -- 2. Are active
  -- 3. Optionally match the position type (can be refined later)
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ps.id,
      'staff_code', ps.staff_code,
      'name', ps.name,
      'role', ps.role,
      'department', ps.department,
      'is_available', NOT EXISTS (
        SELECT 1 FROM farm_positions fp
        WHERE fp.assigned_staff_id = ps.id
          AND fp.farm_id = p_farm_id
          AND fp.status = 'assigned'
      )
    )
  )
  INTO v_result
  FROM platform_staff ps
  WHERE ps.qr_enabled = true
    AND NOT EXISTS (
      SELECT 1 FROM farm_positions fp
      WHERE fp.assigned_staff_id = ps.id
        AND fp.farm_id = p_farm_id
        AND fp.status = 'assigned'
    )
  ORDER BY ps.name;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================
-- 4. FUNCTION: assign_existing_staff_to_position
-- ============================================

CREATE OR REPLACE FUNCTION assign_existing_staff_to_position(
  p_position_id uuid,
  p_staff_id uuid,
  p_assigned_by_staff_id uuid,
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
  v_position_key text;
  v_team_role text;
BEGIN
  -- Check if position exists and get details
  SELECT status, farm_id, position_key
  INTO v_position_status, v_farm_id, v_position_key
  FROM farm_positions
  WHERE id = p_position_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المقعد الوظيفي غير موجود',
      'message_en', 'Position not found'
    );
  END IF;

  -- Check if already assigned
  IF v_position_status = 'assigned' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المقعد محجوز بالفعل. قم بإلغاء التعيين أولاً',
      'message_en', 'Position already assigned. Remove current assignment first'
    );
  END IF;

  -- Get staff user_id
  SELECT user_id INTO v_staff_user_id
  FROM platform_staff
  WHERE id = p_staff_id;

  IF v_staff_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'الموظف المختار غير مرتبط بحساب مستخدم',
      'message_en', 'Selected staff has no linked user account'
    );
  END IF;

  -- Update position
  UPDATE farm_positions
  SET
    assigned_staff_id = p_staff_id,
    status = 'assigned',
    assigned_at = now(),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_position_id;

  -- Determine farm_team role based on position_key
  v_team_role := CASE v_position_key
    WHEN 'field_supervisor' THEN 'field_supervisor'
    WHEN 'factory_supervisor' THEN 'factory_supervisor'
    ELSE 'team_member'
  END;

  -- Add/update in farm_team
  INSERT INTO farm_team (farm_id, user_id, role, is_active)
  VALUES (v_farm_id, v_staff_user_id, v_team_role, true)
  ON CONFLICT (farm_id, user_id, role)
  DO UPDATE SET is_active = true, updated_at = now();

  -- Log the operation
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    new_values,
    performed_by
  ) VALUES (
    'assign_staff_to_farm_position',
    'farm_positions',
    p_position_id,
    jsonb_build_object(
      'staff_id', p_staff_id,
      'farm_id', v_farm_id,
      'position_key', v_position_key,
      'notes', p_notes
    ),
    p_assigned_by_staff_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', 'تم تعيين الموظف بنجاح للمقعد الوظيفي',
    'message_en', 'Staff member assigned successfully to position',
    'position_id', p_position_id,
    'staff_id', p_staff_id,
    'farm_id', v_farm_id
  );
END;
$$;

-- ============================================
-- 5. FUNCTION: unassign_staff_from_position
-- ============================================

CREATE OR REPLACE FUNCTION unassign_staff_from_position(
  p_position_id uuid,
  p_unassigned_by_staff_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_staff_id uuid;
  v_position_key text;
  v_farm_id uuid;
BEGIN
  -- Get current assignment
  SELECT assigned_staff_id, position_key, farm_id
  INTO v_old_staff_id, v_position_key, v_farm_id
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
      'message_en', 'Position is already vacant'
    );
  END IF;

  -- Remove assignment
  UPDATE farm_positions
  SET
    assigned_staff_id = NULL,
    status = 'vacant',
    assigned_at = NULL,
    notes = COALESCE(p_reason, notes),
    updated_at = now()
  WHERE id = p_position_id;

  -- Note: We don't remove from farm_team automatically
  -- Staff might be assigned to multiple positions

  -- Log the operation
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    old_values,
    performed_by
  ) VALUES (
    'unassign_staff_from_farm_position',
    'farm_positions',
    p_position_id,
    jsonb_build_object(
      'staff_id', v_old_staff_id,
      'farm_id', v_farm_id,
      'position_key', v_position_key,
      'reason', p_reason
    ),
    p_unassigned_by_staff_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', 'تم إلغاء تعيين الموظف بنجاح',
    'message_en', 'Staff assignment removed successfully',
    'position_id', p_position_id,
    'removed_staff_id', v_old_staff_id
  );
END;
$$;

-- ============================================
-- 6. FUNCTION: create_staff_request
-- ============================================

CREATE OR REPLACE FUNCTION create_staff_request(
  p_farm_id uuid,
  p_position_id uuid,
  p_requested_by_staff_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position_key text;
  v_position_title_ar text;
  v_position_title_en text;
  v_request_id uuid;
BEGIN
  -- Get position details
  SELECT position_key, title_ar, title_en
  INTO v_position_key, v_position_title_ar, v_position_title_en
  FROM farm_positions
  WHERE id = p_position_id AND farm_id = p_farm_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'المقعد الوظيفي غير موجود',
      'message_en', 'Position not found'
    );
  END IF;

  -- Check if there's already a pending request for this position
  IF EXISTS (
    SELECT 1 FROM staff_requests
    WHERE position_id = p_position_id
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'يوجد طلب معلق بالفعل لهذا المقعد',
      'message_en', 'There is already a pending request for this position'
    );
  END IF;

  -- Create the request
  INSERT INTO staff_requests (
    farm_id,
    position_id,
    requested_role, position_title_ar,
    position_title_en,
    requested_by_staff_id,
    notes,
    status
  ) VALUES (
    p_farm_id,
    p_position_id,
    v_position_key,
    v_position_title_ar,
    v_position_title_en,
    p_requested_by_staff_id,
    p_notes,
    'pending'
  )
  RETURNING id INTO v_request_id;

  -- Log the operation
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    new_values,
    performed_by
  ) VALUES (
    'create_staff_request',
    'staff_requests',
    v_request_id,
    jsonb_build_object(
      'farm_id', p_farm_id,
      'position_id', p_position_id,
      'position_key', v_position_key,
      'notes', p_notes
    ),
    p_requested_by_staff_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', 'تم إرسال الطلب بنجاح للمدير العام',
    'message_en', 'Request sent successfully to General Manager',
    'request_id', v_request_id
  );
END;
$$;

-- ============================================
-- 7. FUNCTION: get_farm_staff_requests
-- ============================================

CREATE OR REPLACE FUNCTION get_farm_staff_requests(
  p_farm_id uuid,
  p_status_filter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sr.id,
      'position_id', sr.position_id,
      'position_title_ar', sr.position_title_ar,
      'position_title_en', sr.position_title_en,
      'requested_role', sr.requested_role,
      'requested_by_staff_id', sr.requested_by_staff_id,
      'requested_by_name', ps.name,
      'notes', sr.notes,
      'status', sr.status,
      'approved_by', sr.approved_by,
      'approved_by_name', approver.name,
      'approved_at', sr.approved_at,
      'rejection_reason', sr.rejection_reason,
      'created_at', sr.created_at
    )
    ORDER BY
      CASE sr.status
        WHEN 'pending' THEN 1
        WHEN 'approved' THEN 2
        WHEN 'rejected' THEN 3
        ELSE 4
      END,
      sr.created_at DESC
  )
  INTO v_result
  FROM staff_requests sr
  LEFT JOIN platform_staff ps ON sr.requested_by_staff_id = ps.id
  LEFT JOIN platform_staff approver ON sr.approved_by = approver.id
  WHERE sr.farm_id = p_farm_id
    AND (p_status_filter IS NULL OR sr.status = p_status_filter);

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================
-- 8. FUNCTION: approve_staff_request
-- ============================================

CREATE OR REPLACE FUNCTION approve_staff_request(
  p_request_id uuid,
  p_approved_by_staff_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
BEGIN
  -- Check request exists and is pending
  SELECT status INTO v_current_status
  FROM staff_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'الطلب غير موجود',
      'message_en', 'Request not found'
    );
  END IF;

  IF v_current_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message_ar', 'تم معالجة هذا الطلب بالفعل',
      'message_en', 'This request has already been processed'
    );
  END IF;

  -- Update request
  UPDATE staff_requests
  SET
    status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    approved_by = p_approved_by_staff_id,
    approved_at = now(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_request_id;

  -- Log the operation
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    new_values,
    performed_by
  ) VALUES (
    CASE WHEN p_approved THEN 'approve_staff_request' ELSE 'reject_staff_request' END,
    'staff_requests',
    p_request_id,
    jsonb_build_object(
      'approved', p_approved,
      'rejection_reason', p_rejection_reason
    ),
    p_approved_by_staff_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_ar', CASE WHEN p_approved 
      THEN 'تمت الموافقة على الطلب بنجاح'
      ELSE 'تم رفض الطلب'
    END,
    'message_en', CASE WHEN p_approved 
      THEN 'Request approved successfully'
      ELSE 'Request rejected'
    END,
    'request_id', p_request_id
  );
END;
$$;

-- ============================================
-- 9. GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_available_staff_for_position TO authenticated, anon;
GRANT EXECUTE ON FUNCTION assign_existing_staff_to_position TO authenticated, anon;
GRANT EXECUTE ON FUNCTION unassign_staff_from_position TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_staff_request TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_farm_staff_requests TO authenticated, anon;
GRANT EXECUTE ON FUNCTION approve_staff_request TO authenticated, anon;
