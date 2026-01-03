/*
  # إصلاح تعارض دالة add_farm_operation_update
  
  المشكلة:
  - يوجد نسختان من دالة add_farm_operation_update بتوقيعات مختلفة
  - PostgREST لا يستطيع التمييز بينهما (function overloading)
  
  الحل:
  - حذف جميع نسخ الدالة
  - إنشاء نسخة واحدة موحدة تدعم images اختيارياً
*/

-- حذف جميع نسخ الدالة
DROP FUNCTION IF EXISTS add_farm_operation_update(uuid, text, text, text, boolean);
DROP FUNCTION IF EXISTS add_farm_operation_update(uuid, text, text, text, jsonb, boolean);

-- إنشاء النسخة الموحدة الوحيدة
CREATE OR REPLACE FUNCTION add_farm_operation_update(
  p_farm_id uuid,
  p_update_type text,
  p_title text,
  p_description text,
  p_images jsonb DEFAULT '[]'::jsonb,
  p_visible boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operation_id uuid;
  v_update_id uuid;
  v_contracts_count integer;
BEGIN
  -- التحقق من صلاحيات المدير
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'غير مصرح'
    );
  END IF;

  -- جلب التشغيل النشط
  SELECT id INTO v_operation_id
  FROM b2f_farm_operations
  WHERE farm_id = p_farm_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'لا يوجد تشغيل نشط لهذه المزرعة'
    );
  END IF;

  -- حساب عدد العقود النشطة
  SELECT COUNT(*) INTO v_contracts_count
  FROM b2f_contracts
  WHERE farm_id = p_farm_id AND status = 'active';

  -- إضافة التحديث
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
  )
  RETURNING id INTO v_update_id;

  -- تحديث آخر تحديث في سجل التشغيل
  UPDATE b2f_farm_operations SET
    last_update_title = p_title,
    last_update_description = p_description,
    last_update_date = now(),
    updated_at = now()
  WHERE id = v_operation_id;

  RETURN jsonb_build_object(
    'success', true,
    'update_id', v_update_id,
    'affectedContracts', v_contracts_count,
    'message', 'تم إضافة التحديث بنجاح'
  );
END;
$$;
