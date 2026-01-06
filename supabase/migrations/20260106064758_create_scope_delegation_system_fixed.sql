/*
  # المرحلة 3: التفويض حسب النطاق (Scope Delegation) - مصحح
  
  ## الفكرة
  بدل التفويض العام: تفويض حسب Cluster
  مشرف القصيم يعتمد مصروفات مزارعه فقط
*/

-- ===================================
-- جدول: Delegation Scopes
-- ===================================
CREATE TABLE IF NOT EXISTS delegation_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  delegator_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  delegate_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  
  permission_type text NOT NULL CHECK (permission_type IN (
    'approve_expenses',
    'approve_decisions',
    'view_reports',
    'manage_teams',
    'assign_tasks'
  )),
  
  scope_type text NOT NULL CHECK (scope_type IN (
    'cluster',
    'farm',
    'region',
    'all'
  )),
  
  scope_id uuid,
  limits jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  UNIQUE (delegate_id, permission_type, scope_type, scope_id)
);

ALTER TABLE delegation_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view relevant delegations"
  ON delegation_scopes FOR SELECT
  USING (
    delegator_id = (current_setting('app.current_staff_id', true))::uuid
    OR delegate_id = (current_setting('app.current_staff_id', true))::uuid
    OR EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
      AND role IN ('general_manager', 'operations_manager')
    )
  );

CREATE POLICY "Delegators and admins can manage delegations"
  ON delegation_scopes FOR ALL
  USING (
    delegator_id = (current_setting('app.current_staff_id', true))::uuid
    OR EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
      AND role IN ('general_manager', 'operations_manager')
    )
  );

-- ===================================
-- دالة: إنشاء تفويض
-- ===================================
CREATE OR REPLACE FUNCTION create_delegation(
  p_delegator_id uuid,
  p_delegate_id uuid,
  p_permission_type text,
  p_scope_type text,
  p_scope_id uuid DEFAULT NULL,
  p_limits jsonb DEFAULT '{}'::jsonb,
  p_valid_until timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delegation_id uuid;
BEGIN
  IF p_delegator_id = p_delegate_id THEN
    RAISE EXCEPTION 'Cannot delegate to yourself';
  END IF;
  
  IF p_scope_type IN ('cluster', 'farm', 'region') AND p_scope_id IS NULL THEN
    RAISE EXCEPTION 'scope_id is required for % scope_type', p_scope_type;
  END IF;
  
  INSERT INTO delegation_scopes (
    delegator_id,
    delegate_id,
    permission_type,
    scope_type,
    scope_id,
    limits,
    valid_until,
    notes,
    status
  ) VALUES (
    p_delegator_id,
    p_delegate_id,
    p_permission_type,
    p_scope_type,
    p_scope_id,
    p_limits,
    p_valid_until,
    p_notes,
    'active'
  )
  ON CONFLICT (delegate_id, permission_type, scope_type, scope_id)
  DO UPDATE SET
    delegator_id = EXCLUDED.delegator_id,
    limits = EXCLUDED.limits,
    valid_until = EXCLUDED.valid_until,
    notes = EXCLUDED.notes,
    status = 'active',
    updated_at = now()
  RETURNING id INTO v_delegation_id;
  
  RETURN v_delegation_id;
END;
$$;

-- ===================================
-- دالة: التحقق من الصلاحية
-- ===================================
CREATE OR REPLACE FUNCTION check_delegation_permission(
  p_staff_id uuid,
  p_permission_type text,
  p_target_id uuid,
  p_target_type text DEFAULT 'cluster'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM delegation_scopes ds
    WHERE ds.delegate_id = p_staff_id
    AND ds.permission_type = p_permission_type
    AND ds.status = 'active'
    AND (ds.valid_until IS NULL OR ds.valid_until > now())
    AND (
      ds.scope_type = 'all'
      OR (ds.scope_type = p_target_type AND ds.scope_id = p_target_id)
      OR (
        ds.scope_type = 'region'
        AND ds.scope_id = (
          CASE 
            WHEN p_target_type = 'cluster' THEN
              (SELECT region_id FROM farm_clusters WHERE id = p_target_id)
            WHEN p_target_type = 'farm' THEN
              (SELECT region_id FROM farm_clusters WHERE id = (SELECT cluster_id FROM b2f_farms WHERE id = p_target_id))
          END
        )
      )
    )
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- ===================================
-- دالة: الحصول على نطاقات الموظف
-- ===================================
CREATE OR REPLACE FUNCTION get_staff_delegations(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ds.id,
        'permission_type', ds.permission_type,
        'scope_type', ds.scope_type,
        'scope_id', ds.scope_id,
        'scope_name', CASE
          WHEN ds.scope_type = 'cluster' THEN (SELECT name FROM farm_clusters WHERE id = ds.scope_id)
          WHEN ds.scope_type = 'farm' THEN (SELECT name FROM b2f_farms WHERE id = ds.scope_id)
          WHEN ds.scope_type = 'region' THEN (SELECT name_ar FROM regions WHERE id = ds.scope_id)
          ELSE 'الكل'
        END,
        'limits', ds.limits,
        'delegator_name', ps.full_name,
        'status', ds.status,
        'valid_from', ds.valid_from,
        'valid_until', ds.valid_until,
        'notes', ds.notes
      )
    ), '[]'::jsonb)
    FROM delegation_scopes ds
    LEFT JOIN platform_staff ps ON ps.id = ds.delegator_id
    WHERE ds.delegate_id = p_staff_id
    AND ds.status = 'active'
    AND (ds.valid_until IS NULL OR ds.valid_until > now())
  );
END;
$$;

-- ===================================
-- دالة: إلغاء تفويض
-- ===================================
CREATE OR REPLACE FUNCTION revoke_delegation(p_delegation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE delegation_scopes
  SET 
    status = 'suspended',
    updated_at = now()
  WHERE id = p_delegation_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: الحصول على جميع التفويضات
-- ===================================
CREATE OR REPLACE FUNCTION get_all_delegations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ds.id,
        'delegator_id', ds.delegator_id,
        'delegator_name', pd.full_name,
        'delegate_id', ds.delegate_id,
        'delegate_name', pe.full_name,
        'permission_type', ds.permission_type,
        'scope_type', ds.scope_type,
        'scope_id', ds.scope_id,
        'scope_name', CASE
          WHEN ds.scope_type = 'cluster' THEN (SELECT name FROM farm_clusters WHERE id = ds.scope_id)
          WHEN ds.scope_type = 'farm' THEN (SELECT name FROM b2f_farms WHERE id = ds.scope_id)
          WHEN ds.scope_type = 'region' THEN (SELECT name_ar FROM regions WHERE id = ds.scope_id)
          ELSE 'الكل'
        END,
        'limits', ds.limits,
        'status', ds.status,
        'valid_from', ds.valid_from,
        'valid_until', ds.valid_until,
        'created_at', ds.created_at
      )
      ORDER BY ds.created_at DESC
    ), '[]'::jsonb)
    FROM delegation_scopes ds
    LEFT JOIN platform_staff pd ON pd.id = ds.delegator_id
    LEFT JOIN platform_staff pe ON pe.id = ds.delegate_id
    WHERE ds.status = 'active'
  );
END;
$$;

CREATE INDEX IF NOT EXISTS idx_delegation_scopes_delegate ON delegation_scopes(delegate_id);
CREATE INDEX IF NOT EXISTS idx_delegation_scopes_delegator ON delegation_scopes(delegator_id);
CREATE INDEX IF NOT EXISTS idx_delegation_scopes_scope ON delegation_scopes(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_delegation_scopes_status ON delegation_scopes(status);
CREATE INDEX IF NOT EXISTS idx_delegation_scopes_valid ON delegation_scopes(valid_until);

ALTER PUBLICATION supabase_realtime ADD TABLE delegation_scopes;
