/*
  # تبسيط دالة create_farm_decision
  
  إزالة جزء التدقيق بالكامل - سيتم التسجيل التلقائي عند الحاجة
*/

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
