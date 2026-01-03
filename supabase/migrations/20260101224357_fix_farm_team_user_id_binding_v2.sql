/*
  # إصلاح ربط user_id في فريق المزارع - نسخة محدثة

  هذا التحديث يحل مشكلة عدم ظهور التبويبات للمشرفين والمدراء
*/

-- دالة بسيطة للربط المباشر (الأسهل للاختبار)
CREATE OR REPLACE FUNCTION quick_bind_to_farm(p_farm_id UUID, p_role TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل دخول');
  END IF;

  -- تحديث السجلات الموجودة أولاً
  UPDATE farm_team_members
  SET user_id = v_user_id
  WHERE farm_id = p_farm_id
  AND role = p_role
  AND user_id IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- إذا لم يتم التحديث، أدرج سجل جديد
  IF v_count = 0 THEN
    INSERT INTO farm_team_members (
      farm_id,
      user_id,
      role,
      full_name,
      is_active
    ) VALUES (
      p_farm_id,
      v_user_id,
      p_role,
      'مستخدم تجريبي',
      true
    )
    ON CONFLICT (farm_id, user_id) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      is_active = true;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'farm_id', p_farm_id,
    'role', p_role,
    'updated', v_count > 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION quick_bind_to_farm(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION quick_bind_to_farm(UUID, TEXT) TO anon;

-- دالة لربط المستخدم الحالي بجميع الأدوار في مزرعة
CREATE OR REPLACE FUNCTION bind_me_to_all_roles(p_farm_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل دخول');
  END IF;

  -- تحديث جميع السجلات في هذه المزرعة
  UPDATE farm_team_members
  SET user_id = v_user_id
  WHERE farm_id = p_farm_id
  AND user_id IS NULL
  AND is_active = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'farm_id', p_farm_id,
    'roles_updated', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bind_me_to_all_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bind_me_to_all_roles(UUID) TO anon;