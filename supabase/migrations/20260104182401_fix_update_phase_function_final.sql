/*
  # إصلاح دالة update_farm_operation_phase

  1. التحديثات
    - إعادة كتابة دالة update_farm_operation_phase
    - دعم الحقول الصحيحة
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS update_farm_operation_phase(uuid, text, uuid);

-- إنشاء الدالة الجديدة
CREATE OR REPLACE FUNCTION update_farm_operation_phase(
  p_operation_id uuid,
  p_new_phase text,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_old_phase text;
  v_progress int;
  v_date_field text;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT is_platform_staff(p_staff_id) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- جلب البيانات الحالية
  SELECT farm_id, current_phase INTO v_farm_id, v_old_phase
  FROM b2f_farm_operations
  WHERE id = p_operation_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'التشغيل غير موجود');
  END IF;

  -- حساب نسبة الإنجاز حسب المرحلة
  v_progress := CASE p_new_phase
    WHEN 'preparation' THEN 10
    WHEN 'planting' THEN 25
    WHEN 'irrigation' THEN 40
    WHEN 'maintenance' THEN 60
    WHEN 'harvesting' THEN 85
    WHEN 'completed' THEN 100
    ELSE 0
  END;

  -- تحديث المرحلة مع التواريخ
  UPDATE b2f_farm_operations
  SET 
    current_phase = p_new_phase,
    progress_percentage = v_progress,
    last_update_title = 'تحديث المرحلة',
    last_update_description = 'تم الانتقال إلى مرحلة ' || p_new_phase,
    last_update_date = now(),
    preparation_date = CASE WHEN p_new_phase = 'preparation' THEN now() ELSE preparation_date END,
    planting_date = CASE WHEN p_new_phase = 'planting' THEN now() ELSE planting_date END,
    irrigation_date = CASE WHEN p_new_phase = 'irrigation' THEN now() ELSE irrigation_date END,
    maintenance_date = CASE WHEN p_new_phase = 'maintenance' THEN now() ELSE maintenance_date END,
    harvesting_date = CASE WHEN p_new_phase = 'harvesting' THEN now() ELSE harvesting_date END,
    completed_date = CASE WHEN p_new_phase = 'completed' THEN now() ELSE completed_date END,
    end_date = CASE WHEN p_new_phase = 'completed' THEN now() ELSE end_date END,
    updated_at = now()
  WHERE id = p_operation_id;

  -- إضافة تحديث
  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    related_phase,
    visible_to_investors
  ) VALUES (
    p_operation_id,
    v_farm_id,
    'phase_change',
    'تحديث المرحلة التشغيلية',
    'تم الانتقال من ' || v_old_phase || ' إلى ' || p_new_phase,
    p_new_phase,
    true
  );

  RETURN json_build_object('success', true, 'message', 'تم تحديث المرحلة بنجاح');
END;
$$;

GRANT EXECUTE ON FUNCTION update_farm_operation_phase TO anon, authenticated;