/*
  # نظام الحوكمة والتحكم المركزي للمزارع

  1. الجداول الجديدة:
    - fc_approval_requests - طلبات الموافقة
    - fc_decision_log - سجل القرارات
    - fc_farm_alerts - التنبيهات الذكية

  2. التعديلات:
    - إضافة operational_status للمزارع

  3. الدوال:
    - calculate_farm_readiness() - حساب جاهزية المزرعة
    - create_approval_request() - إنشاء طلب موافقة
    - approve_request() - الموافقة على طلب
    - log_decision() - تسجيل قرار

  4. الأمان:
    - RLS policies لجميع الجداول
*/

-- إضافة حقل operational_status للمزارع
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'operational_status'
  ) THEN
    ALTER TABLE b2f_farms 
    ADD COLUMN operational_status text NOT NULL DEFAULT 'setup'
    CHECK (operational_status IN ('setup', 'active', 'suspended'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN suspended_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'suspended_reason'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN suspended_reason text;
  END IF;
END $$;

-- جدول طلبات الموافقة
CREATE TABLE IF NOT EXISTS fc_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN (
    'publish_farm', 
    'change_status', 
    'change_manager', 
    'large_expense', 
    'activate_facility'
  )),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES platform_staff(id) NOT NULL,
  request_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid REFERENCES platform_staff(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fc_approval_requests_farm ON fc_approval_requests(farm_id);
CREATE INDEX IF NOT EXISTS idx_fc_approval_requests_status ON fc_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_fc_approval_requests_type ON fc_approval_requests(request_type);

-- جدول سجل القرارات
CREATE TABLE IF NOT EXISTS fc_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  decided_by uuid REFERENCES platform_staff(id) NOT NULL,
  decision_data jsonb NOT NULL,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fc_decision_log_farm ON fc_decision_log(farm_id);
CREATE INDEX IF NOT EXISTS idx_fc_decision_log_type ON fc_decision_log(decision_type);
CREATE INDEX IF NOT EXISTS idx_fc_decision_log_date ON fc_decision_log(created_at);

-- جدول التنبيهات الذكية
CREATE TABLE IF NOT EXISTS fc_farm_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  data jsonb,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fc_farm_alerts_farm ON fc_farm_alerts(farm_id);
CREATE INDEX IF NOT EXISTS idx_fc_farm_alerts_resolved ON fc_farm_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_fc_farm_alerts_severity ON fc_farm_alerts(severity);

-- RLS Policies
ALTER TABLE fc_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_farm_alerts ENABLE ROW LEVEL SECURITY;

-- Policies (simplified for admin access)
CREATE POLICY "Allow admin access to approval requests"
  ON fc_approval_requests FOR ALL
  USING (true);

CREATE POLICY "Allow admin access to decision log"
  ON fc_decision_log FOR ALL
  USING (true);

CREATE POLICY "Allow admin access to farm alerts"
  ON fc_farm_alerts FOR ALL
  USING (true);

-- دالة حساب جاهزية المزرعة (Readiness Score)
CREATE OR REPLACE FUNCTION calculate_farm_readiness(p_farm_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score integer := 0;
  v_has_manager boolean;
  v_has_team boolean;
  v_has_contents boolean;
  v_has_equipment boolean;
  v_has_financial boolean;
BEGIN
  -- 1. مدير موجود (20%)
  SELECT EXISTS (
    SELECT 1 FROM fc_operational_farms
    WHERE reference_farm_id = p_farm_id
    AND farm_manager_id IS NOT NULL
  ) INTO v_has_manager;
  
  IF v_has_manager THEN
    v_score := v_score + 20;
  END IF;

  -- 2. فريق واحد على الأقل (20%)
  SELECT EXISTS (
    SELECT 1 FROM fc_farm_teams
    WHERE farm_id = p_farm_id
    AND is_active = true
  ) INTO v_has_team;
  
  IF v_has_team THEN
    v_score := v_score + 20;
  END IF;

  -- 3. محتويات مدخلة (20%)
  SELECT EXISTS (
    SELECT 1 FROM fc_farm_contents
    WHERE farm_id = p_farm_id
  ) INTO v_has_contents;
  
  IF v_has_contents THEN
    v_score := v_score + 20;
  END IF;

  -- 4. معدات مسجلة (20%)
  SELECT EXISTS (
    SELECT 1 FROM fc_equipment
    WHERE farm_id = p_farm_id
  ) INTO v_has_equipment;
  
  IF v_has_equipment THEN
    v_score := v_score + 20;
  END IF;

  -- 5. سجل مالي (20%)
  SELECT EXISTS (
    SELECT 1 FROM fc_financial_ledger
    WHERE farm_id = p_farm_id
  ) INTO v_has_financial;
  
  IF v_has_financial THEN
    v_score := v_score + 20;
  END IF;

  RETURN v_score;
END;
$$;

-- دالة إنشاء طلب موافقة
CREATE OR REPLACE FUNCTION create_approval_request(
  p_request_type text,
  p_farm_id uuid,
  p_requested_by uuid,
  p_request_data jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_result json;
BEGIN
  -- إنشاء الطلب
  INSERT INTO fc_approval_requests (
    request_type,
    farm_id,
    requested_by,
    request_data,
    status
  ) VALUES (
    p_request_type,
    p_farm_id,
    p_requested_by,
    p_request_data,
    'pending'
  )
  RETURNING id INTO v_request_id;

  -- تسجيل في سجل القرارات
  INSERT INTO fc_decision_log (
    decision_type,
    farm_id,
    decided_by,
    decision_data,
    reason
  ) VALUES (
    'approval_request_created',
    p_farm_id,
    p_requested_by,
    json_build_object(
      'request_id', v_request_id,
      'request_type', p_request_type
    ),
    'طلب موافقة جديد'
  );

  SELECT json_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'تم إنشاء طلب الموافقة بنجاح'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة الموافقة على طلب
CREATE OR REPLACE FUNCTION approve_request(
  p_request_id uuid,
  p_reviewed_by uuid,
  p_review_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request fc_approval_requests;
  v_result json;
BEGIN
  -- جلب الطلب
  SELECT * INTO v_request
  FROM fc_approval_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الطلب غير موجود'
    );
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الطلب تمت معالجته مسبقاً'
    );
  END IF;

  -- تحديث حالة الطلب
  UPDATE fc_approval_requests
  SET 
    status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_notes = p_review_notes,
    updated_at = now()
  WHERE id = p_request_id;

  -- تنفيذ القرار بناءً على نوع الطلب
  IF v_request.request_type = 'change_status' THEN
    UPDATE b2f_farms
    SET operational_status = v_request.request_data->>'new_status'
    WHERE id = v_request.farm_id;
  END IF;

  IF v_request.request_type = 'change_manager' THEN
    UPDATE fc_operational_farms
    SET farm_manager_id = (v_request.request_data->>'new_manager_id')::uuid
    WHERE reference_farm_id = v_request.farm_id;
  END IF;

  -- تسجيل في سجل القرارات
  INSERT INTO fc_decision_log (
    decision_type,
    farm_id,
    decided_by,
    decision_data,
    reason,
    notes
  ) VALUES (
    'approval_granted',
    v_request.farm_id,
    p_reviewed_by,
    json_build_object(
      'request_id', p_request_id,
      'request_type', v_request.request_type,
      'request_data', v_request.request_data
    ),
    'تمت الموافقة',
    p_review_notes
  );

  SELECT json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الطلب بنجاح'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة رفض طلب
CREATE OR REPLACE FUNCTION reject_request(
  p_request_id uuid,
  p_reviewed_by uuid,
  p_review_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request fc_approval_requests;
  v_result json;
BEGIN
  -- جلب الطلب
  SELECT * INTO v_request
  FROM fc_approval_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الطلب غير موجود'
    );
  END IF;

  -- تحديث حالة الطلب
  UPDATE fc_approval_requests
  SET 
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_notes = p_review_notes,
    updated_at = now()
  WHERE id = p_request_id;

  -- تسجيل في سجل القرارات
  INSERT INTO fc_decision_log (
    decision_type,
    farm_id,
    decided_by,
    decision_data,
    reason,
    notes
  ) VALUES (
    'approval_rejected',
    v_request.farm_id,
    p_reviewed_by,
    json_build_object(
      'request_id', p_request_id,
      'request_type', v_request.request_type
    ),
    'تم رفض الطلب',
    p_review_notes
  );

  SELECT json_build_object(
    'success', true,
    'message', 'تم رفض الطلب'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة تسجيل قرار
CREATE OR REPLACE FUNCTION log_decision(
  p_decision_type text,
  p_farm_id uuid,
  p_decided_by uuid,
  p_decision_data jsonb,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO fc_decision_log (
    decision_type,
    farm_id,
    decided_by,
    decision_data,
    reason,
    notes
  ) VALUES (
    p_decision_type,
    p_farm_id,
    p_decided_by,
    p_decision_data,
    p_reason,
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN json_build_object(
    'success', true,
    'log_id', v_log_id
  );
END;
$$;

-- دالة الحصول على إحصائيات القيادة
CREATE OR REPLACE FUNCTION get_farm_command_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_farms integer;
  v_active_farms integer;
  v_suspended_farms integer;
  v_pending_approvals integer;
  v_critical_alerts integer;
  v_result json;
BEGIN
  -- إجمالي المزارع
  SELECT COUNT(*) INTO v_total_farms
  FROM b2f_farms;

  -- المزارع النشطة
  SELECT COUNT(*) INTO v_active_farms
  FROM b2f_farms
  WHERE operational_status = 'active';

  -- المزارع الموقوفة
  SELECT COUNT(*) INTO v_suspended_farms
  FROM b2f_farms
  WHERE operational_status = 'suspended';

  -- الموافقات المعلقة
  SELECT COUNT(*) INTO v_pending_approvals
  FROM fc_approval_requests
  WHERE status = 'pending';

  -- التنبيهات الحرجة
  SELECT COUNT(*) INTO v_critical_alerts
  FROM fc_farm_alerts
  WHERE severity = 'critical'
  AND is_resolved = false;

  SELECT json_build_object(
    'total_farms', v_total_farms,
    'active_farms', v_active_farms,
    'suspended_farms', v_suspended_farms,
    'pending_approvals', v_pending_approvals,
    'critical_alerts', v_critical_alerts
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Triggers لتحديث updated_at
CREATE OR REPLACE FUNCTION update_approval_request_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_approval_request_updated_at ON fc_approval_requests;
CREATE TRIGGER trigger_update_approval_request_updated_at
  BEFORE UPDATE ON fc_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_request_updated_at();
