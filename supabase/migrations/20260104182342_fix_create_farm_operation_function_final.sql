/*
  # إصلاح دالة create_farm_operation للعمل مع الهيكل الصحيح

  1. التحديثات
    - إعادة كتابة دالة create_farm_operation
    - دعم الحقول الصحيحة
    - إضافة التحقق من الصلاحيات
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS create_farm_operation(uuid, text, uuid);

-- إنشاء الدالة الجديدة
CREATE OR REPLACE FUNCTION create_farm_operation(
  p_farm_id uuid,
  p_initial_phase text DEFAULT 'preparation',
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operation_id uuid;
  v_farm_name text;
  v_season_name text;
BEGIN
  -- التحقق من صلاحيات الإدارة
  IF NOT is_platform_staff(p_staff_id) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح لك بهذا الإجراء. يرجى تسجيل الدخول أولاً.');
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

  -- إنشاء اسم موسم تلقائي
  v_season_name := 'موسم ' || to_char(now(), 'YYYY');

  -- إنشاء التشغيل
  INSERT INTO b2f_farm_operations (
    farm_id,
    season_name,
    start_date,
    current_phase,
    progress_percentage,
    preparation_date,
    last_update_title,
    last_update_description,
    last_update_date,
    is_active
  ) VALUES (
    p_farm_id,
    v_season_name,
    now(),
    p_initial_phase,
    5,
    CASE WHEN p_initial_phase = 'preparation' THEN now() ELSE NULL END,
    'تم إنشاء التشغيل',
    'تم البدء بالعمليات التشغيلية للمزرعة',
    now(),
    true
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
    'seasonName', v_season_name,
    'message', 'تم إنشاء التشغيل بنجاح'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_farm_operation TO anon, authenticated;