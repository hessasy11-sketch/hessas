/*
  # إضافة قيود الوصول لخدمة المستثمر

  ## المشكلة
  - حالياً يمكن لأي شخص تقديم طلب خدمة بدون التحقق من:
    - وجود سجل تشغيل نشط
    - أن الطلب مرتبط بطلب مبيعات معتمد
    - أن الأشجار في مرحلة تشغيلية مناسبة

  ## الحل
  - إضافة سياسات RLS تتحقق من:
    1. وجود سجل في b2f_tree_operations
    2. أن السجل التشغيلي نشط (is_active = true)
    3. بعض الخدمات تتطلب أن تكون الأشجار في مرحلة متقدمة (requires_tree_ready)
*/

-- حذف السياسة القديمة المفتوحة
DROP POLICY IF EXISTS "Public can create requests" ON b2f_investor_service_requests;

-- سياسة جديدة: السماح بإنشاء طلب فقط إذا كان هناك سجل تشغيل نشط
CREATE POLICY "Allow create service request only with active operation"
  ON b2f_investor_service_requests FOR INSERT
  TO public
  WITH CHECK (
    -- التحقق من وجود سجل تشغيل نشط
    EXISTS (
      SELECT 1 FROM b2f_tree_operations
      WHERE id = tree_operation_id
      AND is_active = true
      AND is_paused = false
    )
    AND
    -- التحقق من أن الخدمة متاحة حسب حالة الشجرة
    (
      -- إذا كانت الخدمة تتطلب شجرة جاهزة (requires_tree_ready)
      -- يجب أن تكون الشجرة في مرحلة متقدمة (ليس activation فقط)
      NOT EXISTS (
        SELECT 1 FROM b2f_service_types
        WHERE id = service_type
        AND requires_tree_ready = true
      )
      OR
      -- أو أن الشجرة في مرحلة متقدمة
      EXISTS (
        SELECT 1 FROM b2f_tree_operations
        WHERE id = tree_operation_id
        AND current_phase IN ('fruiting', 'pre_harvest', 'ready')
      )
    )
  );

-- دالة مساعدة للتحقق من إمكانية تقديم طلب خدمة
CREATE OR REPLACE FUNCTION can_submit_service_request(
  p_tree_operation_id uuid,
  p_service_type text
)
RETURNS jsonb AS $$
DECLARE
  v_operation record;
  v_service_type record;
  v_result jsonb;
BEGIN
  -- جلب بيانات العملية التشغيلية
  SELECT * INTO v_operation
  FROM b2f_tree_operations
  WHERE id = p_tree_operation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'لا يوجد سجل تشغيل لهذا الطلب'
    );
  END IF;

  IF v_operation.is_active = false THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'سجل التشغيل غير نشط'
    );
  END IF;

  IF v_operation.is_paused = true THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'سجل التشغيل متوقف مؤقتاً: ' || COALESCE(v_operation.pause_reason, 'بدون سبب محدد')
    );
  END IF;

  -- جلب بيانات نوع الخدمة
  SELECT * INTO v_service_type
  FROM b2f_service_types
  WHERE id = p_service_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'نوع الخدمة غير موجود'
    );
  END IF;

  -- التحقق من أن الخدمة تتطلب شجرة جاهزة
  IF v_service_type.requires_tree_ready = true THEN
    IF v_operation.current_phase NOT IN ('fruiting', 'pre_harvest', 'ready') THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'هذه الخدمة متاحة فقط عندما تصل الأشجار لمرحلة الإثمار أو الجاهزية',
        'current_phase', v_operation.current_phase
      );
    END IF;
  END IF;

  -- الطلب مسموح
  RETURN jsonb_build_object(
    'allowed', true,
    'operation_phase', v_operation.current_phase,
    'tree_count', v_operation.tree_count,
    'investor_classification', v_operation.investor_classification
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_submit_service_request(uuid, text) TO public;

COMMENT ON FUNCTION can_submit_service_request(uuid, text) IS 'التحقق من إمكانية تقديم طلب خدمة معين لعملية تشغيلية محددة';

-- Trigger لتسجيل إنشاء الطلب تلقائياً
CREATE OR REPLACE FUNCTION log_service_request_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO b2f_service_request_logs (
    request_id,
    action_type,
    new_status,
    description,
    admin_name
  )
  VALUES (
    NEW.id,
    'created',
    NEW.status,
    'تم إنشاء طلب ' || (SELECT name_ar FROM b2f_service_types WHERE id = NEW.service_type),
    NEW.investor_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_service_request_creation ON b2f_investor_service_requests;
CREATE TRIGGER trigger_log_service_request_creation
  AFTER INSERT ON b2f_investor_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_service_request_creation();

COMMENT ON FUNCTION log_service_request_creation() IS 'تسجيل إنشاء طلب خدمة جديد في السجل تلقائياً';
