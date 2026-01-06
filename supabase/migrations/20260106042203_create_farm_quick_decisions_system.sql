/*
  # إنشاء نظام القرارات السريعة للمزارع

  1. الوظائف الجديدة:
    - `create_farm_decision` - إنشاء قرار جديد للمزرعة
    - دعم 3 أنواع من القرارات:
      * change_farm_manager: تغيير مدير المزرعة
      * suspend_bookings: إيقاف حجوزات مؤقتًا
      * financial_review: مراجعة مالية
    
  2. الأمان:
    - فحص وجود المزرعة
    - حفظ بيانات المزرعة الحالية
    - إنشاء سجل تدقيق تلقائي
    - تعيين الأولوية حسب نوع القرار
*/

-- دالة إنشاء قرار سريع للمزرعة
CREATE OR REPLACE FUNCTION create_farm_decision(
  p_farm_id uuid,
  p_decision_type text,
  p_notes text DEFAULT NULL,
  p_requested_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_farm_name text;
  v_farm_status text;
  v_priority text;
  v_action_data jsonb;
BEGIN
  -- التحقق من وجود المزرعة
  SELECT name, operational_status 
  INTO v_farm_name, v_farm_status
  FROM b2f_farms 
  WHERE id = p_farm_id;
  
  IF v_farm_name IS NULL THEN
    RAISE EXCEPTION 'المزرعة غير موجودة';
  END IF;
  
  -- تحديد الأولوية حسب نوع القرار
  v_priority := CASE p_decision_type
    WHEN 'change_farm_manager' THEN 'high'
    WHEN 'suspend_bookings' THEN 'urgent'
    WHEN 'financial_review' THEN 'high'
    ELSE 'normal'
  END;
  
  -- إعداد بيانات الإجراء
  v_action_data := jsonb_build_object(
    'farm_name', v_farm_name,
    'current_status', v_farm_status,
    'created_from', 'farms_comparison_panel',
    'reason', CASE p_decision_type
      WHEN 'change_farm_manager' THEN 'أداء ضعيف يتطلب تغيير الإدارة'
      WHEN 'suspend_bookings' THEN 'حاجة لإيقاف مؤقت للحجوزات لحين التحسين'
      WHEN 'financial_review' THEN 'مشاكل مالية تتطلب مراجعة شاملة'
      ELSE 'مراجعة عامة'
    END
  );
  
  -- إنشاء القرار
  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    status,
    priority,
    requested_by,
    notes,
    action_data
  ) VALUES (
    p_decision_type,
    p_farm_id,
    'pending',
    v_priority,
    p_requested_by,
    p_notes,
    v_action_data
  )
  RETURNING id INTO v_decision_id;
  
  -- إنشاء سجل تدقيق
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    changes,
    staff_id
  ) VALUES (
    'create_decision',
    'decision_queue',
    v_decision_id,
    jsonb_build_object(
      'decision_type', p_decision_type,
      'farm_id', p_farm_id,
      'farm_name', v_farm_name,
      'priority', v_priority,
      'status', 'pending'
    ),
    p_requested_by
  );
  
  -- إرجاع بيانات القرار المنشأ
  RETURN json_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'farm_name', v_farm_name,
    'decision_type', p_decision_type,
    'priority', v_priority,
    'status', 'pending',
    'message', 'تم إنشاء القرار بنجاح - في انتظار موافقة المدير العام'
  );
END;
$$;

-- دالة للحصول على قرارات المزرعة
CREATE OR REPLACE FUNCTION get_farm_decisions(
  p_farm_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  decision_type text,
  status text,
  priority text,
  notes text,
  action_data jsonb,
  requested_by_name text,
  approved_by_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dq.id,
    dq.decision_type,
    dq.status,
    dq.priority,
    dq.notes,
    dq.action_data,
    ps1.full_name as requested_by_name,
    ps2.full_name as approved_by_name,
    dq.created_at,
    dq.updated_at
  FROM decision_queue dq
  LEFT JOIN platform_staff ps1 ON dq.requested_by = ps1.id
  LEFT JOIN platform_staff ps2 ON dq.approved_by = ps2.id
  WHERE dq.farm_id = p_farm_id
    AND (p_status IS NULL OR dq.status = p_status)
  ORDER BY dq.created_at DESC;
END;
$$;

-- سياسات RLS
ALTER TABLE decision_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role all access" ON decision_queue;
CREATE POLICY "Allow service role all access"
  ON decision_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon create decisions" ON decision_queue;
CREATE POLICY "Allow anon create decisions"
  ON decision_queue
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read decisions" ON decision_queue;
CREATE POLICY "Allow anon read decisions"
  ON decision_queue
  FOR SELECT
  TO anon
  USING (true);
