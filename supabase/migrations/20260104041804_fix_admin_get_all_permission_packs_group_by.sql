/*
  # إصلاح خطأ GROUP BY في دالة admin_get_all_permission_packs

  1. المشكلة
    - created_at يظهر في SELECT ولكن ليس في GROUP BY
    - هذا يسبب خطأ SQL
    
  2. الحل
    - إعادة كتابة الـ query بشكل صحيح
    - استخدام subquery لحساب الإحصائيات
*/

CREATE OR REPLACE FUNCTION admin_get_all_permission_packs(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_platform_admin_by_staff(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بعرض حزم الصلاحيات'
    );
  END IF;

  -- جلب جميع الحزم مع عدد الصلاحيات والموظفين
  SELECT jsonb_agg(pack_data ORDER BY created_at DESC)
  INTO v_result
  FROM (
    SELECT 
      jsonb_build_object(
        'id', pp.id,
        'name', pp.name,
        'description', pp.description,
        'target_boards', pp.target_boards,
        'requires_pin', pp.requires_pin,
        'session_idle_minutes', pp.session_idle_minutes,
        'landing_route', pp.landing_route,
        'is_active', pp.is_active,
        'created_at', pp.created_at,
        'updated_at', pp.updated_at,
        'permissions_count', COALESCE(
          (SELECT COUNT(*) FROM pack_permissions WHERE pack_id = pp.id), 
          0
        ),
        'staff_count', COALESCE(
          (SELECT COUNT(*) FROM platform_staff WHERE pack_id = pp.id AND is_active = true), 
          0
        )
      ) as pack_data,
      pp.created_at
    FROM permission_packs pp
  ) as packs;

  RETURN jsonb_build_object(
    'success', true,
    'packs', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;
