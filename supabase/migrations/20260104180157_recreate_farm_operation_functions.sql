/*
  # إعادة إنشاء دوال التشغيل على مستوى المزرعة

  ## المشكلة
  - دالة `create_farm_operation` غير موجودة في قاعدة البيانات
  - هذا يمنع إنشاء تشغيل جديد للمزارع

  ## الحل
  - إعادة إنشاء جميع الدوال المطلوبة للتشغيل على مستوى المزرعة
  - دالة إنشاء تشغيل جديد
  - دالة تحديث المرحلة
  - دالة إضافة تحديث عام
*/

-- =====================================================
-- 1. دالة: إنشاء تشغيل جديد للمزرعة
-- =====================================================

CREATE OR REPLACE FUNCTION create_farm_operation(
  p_farm_id uuid,
  p_initial_phase text DEFAULT 'preparation'
)
RETURNS json AS $$
DECLARE
  v_operation_id uuid;
  v_farm_name text;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- التحقق من وجود المزرعة
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المزرعة غير موجودة');
  END IF;

  -- التحقق من عدم وجود تشغيل نشط
  IF EXISTS (SELECT 1 FROM b2f_farm_operations WHERE farm_id = p_farm_id AND is_active = true) THEN
    RETURN json_build_object('success', false, 'error', 'يوجد تشغيل نشط بالفعل لهذه المزرعة');
  END IF;

  -- إنشاء التشغيل
  INSERT INTO b2f_farm_operations (
    farm_id,
    current_phase,
    progress_percentage,
    preparation_date,
    last_update_title,
    last_update_description
  ) VALUES (
    p_farm_id,
    p_initial_phase,
    5,
    CASE WHEN p_initial_phase = 'preparation' THEN now() ELSE NULL END,
    'تم إنشاء التشغيل',
    'تم البدء بالعمليات التشغيلية للمزرعة'
  ) RETURNING id INTO v_operation_id;

  -- إضافة تحديث أولي
  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    related_phase,
    visible_to_investors
  ) VALUES (
    v_operation_id,
    p_farm_id,
    'phase_change',
    'بدء العمليات التشغيلية',
    'تم إنشاء سجل التشغيل للمزرعة. سيتم تحديثكم بكل جديد.',
    p_initial_phase,
    true
  );

  RETURN json_build_object(
    'success', true,
    'operationId', v_operation_id,
    'farmName', v_farm_name,
    'message', 'تم إنشاء التشغيل بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. دالة: تحديث مرحلة المزرعة
-- =====================================================

CREATE OR REPLACE FUNCTION update_farm_operation_phase(
  p_farm_id uuid,
  p_new_phase text,
  p_title text,
  p_description text,
  p_progress integer DEFAULT NULL,
  p_images jsonb DEFAULT '[]'::jsonb
)
RETURNS json AS $$
DECLARE
  v_operation_id uuid;
  v_old_phase text;
  v_farm_name text;
  v_contracts_count integer;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT id, current_phase INTO v_operation_id, v_old_phase
  FROM b2f_farm_operations
  WHERE farm_id = p_farm_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لا يوجد تشغيل نشط لهذه المزرعة');
  END IF;

  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;

  SELECT COUNT(*) INTO v_contracts_count
  FROM b2f_contracts
  WHERE farm_id = p_farm_id AND status = 'active';

  UPDATE b2f_farm_operations SET
    current_phase = p_new_phase,
    progress_percentage = COALESCE(p_progress, progress_percentage),
    last_update_title = p_title,
    last_update_description = p_description,
    last_update_date = now(),
    activation_date = CASE WHEN p_new_phase = 'activation' AND activation_date IS NULL THEN now() ELSE activation_date END,
    service_start_date = CASE WHEN p_new_phase = 'service' AND service_start_date IS NULL THEN now() ELSE service_start_date END,
    irrigation_start_date = CASE WHEN p_new_phase = 'irrigation' AND irrigation_start_date IS NULL THEN now() ELSE irrigation_start_date END,
    fruiting_start_date = CASE WHEN p_new_phase = 'fruiting' AND fruiting_start_date IS NULL THEN now() ELSE fruiting_start_date END,
    pre_harvest_date = CASE WHEN p_new_phase = 'pre_harvest' AND pre_harvest_date IS NULL THEN now() ELSE pre_harvest_date END,
    harvest_start_date = CASE WHEN p_new_phase = 'harvest' AND harvest_start_date IS NULL THEN now() ELSE harvest_start_date END,
    post_harvest_date = CASE WHEN p_new_phase = 'post_harvest' AND post_harvest_date IS NULL THEN now() ELSE post_harvest_date END,
    updated_at = now()
  WHERE id = v_operation_id;

  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    old_value,
    new_value,
    related_phase,
    images,
    visible_to_investors
  ) VALUES (
    v_operation_id,
    p_farm_id,
    'phase_change',
    p_title,
    p_description,
    v_old_phase,
    p_new_phase,
    p_new_phase,
    p_images,
    true
  );

  RETURN json_build_object(
    'success', true,
    'farmName', v_farm_name,
    'affectedContracts', v_contracts_count,
    'message', format('تم التحديث بنجاح. سيصل للمستثمرين (%s عقد)', v_contracts_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. دالة: إضافة تحديث عام للمزرعة
-- =====================================================

CREATE OR REPLACE FUNCTION add_farm_operation_update(
  p_farm_id uuid,
  p_update_type text,
  p_title text,
  p_description text,
  p_images jsonb DEFAULT '[]'::jsonb,
  p_visible boolean DEFAULT true
)
RETURNS json AS $$
DECLARE
  v_operation_id uuid;
  v_contracts_count integer;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT id INTO v_operation_id
  FROM b2f_farm_operations
  WHERE farm_id = p_farm_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لا يوجد تشغيل نشط لهذه المزرعة');
  END IF;

  SELECT COUNT(*) INTO v_contracts_count
  FROM b2f_contracts
  WHERE farm_id = p_farm_id AND status = 'active';

  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    images,
    visible_to_investors
  ) VALUES (
    v_operation_id,
    p_farm_id,
    p_update_type,
    p_title,
    p_description,
    p_images,
    p_visible
  );

  UPDATE b2f_farm_operations SET
    last_update_title = p_title,
    last_update_description = p_description,
    last_update_date = now(),
    updated_at = now()
  WHERE id = v_operation_id;

  RETURN json_build_object(
    'success', true,
    'affectedContracts', v_contracts_count,
    'message', 'تم إضافة التحديث بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;