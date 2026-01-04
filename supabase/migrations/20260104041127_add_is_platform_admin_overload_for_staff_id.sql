/*
  # إضافة overload لدالة is_platform_admin لقبول staff_id

  1. المشكلة
    - الدالة is_platform_admin الحالية تقبل user_id من auth.users
    - الدوال الجديدة تمرر staff_id من platform_staff
    - نحتاج overload لقبول staff_id مباشرة
    
  2. الحل
    - إضافة نسخة جديدة من is_platform_admin تقبل staff_id
    - تتحقق من جدول platform_staff مباشرة
    - لا تحتاج إلى auth.uid()
    
  3. الاستخدام
    - is_platform_admin(user_id) → للاستخدام القديم مع auth
    - is_platform_admin_by_staff(staff_id) → للاستخدام مع QR/PIN
*/

-- دالة جديدة للتحقق من صلاحية المدير باستخدام staff_id
CREATE OR REPLACE FUNCTION is_platform_admin_by_staff(p_staff_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM platform_staff
    WHERE id = p_staff_id
    AND role IN ('platform_owner', 'super_admin', 'general_manager')
    AND is_active = true
  );
END;
$$;

-- تحديث جميع الدوال لاستخدام الدالة الجديدة
CREATE OR REPLACE FUNCTION admin_create_permission_pack(
  p_staff_id uuid,
  p_name text,
  p_description text,
  p_target_boards text[],
  p_requires_pin boolean,
  p_session_idle_minutes integer,
  p_landing_route text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack_record RECORD;
BEGIN
  -- التحقق من صلاحية المدير
  IF NOT is_platform_admin_by_staff(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بإنشاء حزم الصلاحيات'
    );
  END IF;

  -- التحقق من عدم وجود حزمة بنفس الاسم
  IF EXISTS (SELECT 1 FROM permission_packs WHERE name = p_name) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'يوجد حزمة بنفس الاسم مسبقاً'
    );
  END IF;

  -- إنشاء الحزمة
  INSERT INTO permission_packs (
    name,
    description,
    target_boards,
    requires_pin,
    session_idle_minutes,
    landing_route,
    is_active,
    created_by
  )
  VALUES (
    p_name,
    p_description,
    p_target_boards,
    p_requires_pin,
    p_session_idle_minutes,
    p_landing_route,
    true,
    p_staff_id
  )
  RETURNING * INTO v_pack_record;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إنشاء حزمة الصلاحيات بنجاح',
    'pack', row_to_json(v_pack_record)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء إنشاء الحزمة: ' || SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_permission_pack(
  p_staff_id uuid,
  p_pack_id uuid,
  p_name text,
  p_description text,
  p_target_boards text[],
  p_requires_pin boolean,
  p_session_idle_minutes integer,
  p_landing_route text,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack_record RECORD;
BEGIN
  IF NOT is_platform_admin_by_staff(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بتحديث حزم الصلاحيات'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM permission_packs WHERE id = p_pack_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الحزمة غير موجودة'
    );
  END IF;

  UPDATE permission_packs
  SET
    name = p_name,
    description = p_description,
    target_boards = p_target_boards,
    requires_pin = p_requires_pin,
    session_idle_minutes = p_session_idle_minutes,
    landing_route = p_landing_route,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_pack_id
  RETURNING * INTO v_pack_record;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث حزمة الصلاحيات بنجاح',
    'pack', row_to_json(v_pack_record)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء تحديث الحزمة: ' || SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_permission_pack(
  p_staff_id uuid,
  p_pack_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_count integer;
BEGIN
  IF NOT is_platform_admin_by_staff(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بحذف حزم الصلاحيات'
    );
  END IF;

  SELECT COUNT(*) INTO v_staff_count
  FROM platform_staff
  WHERE pack_id = p_pack_id
  AND is_active = true;

  IF v_staff_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا يمكن حذف الحزمة لوجود ' || v_staff_count || ' موظف مرتبط بها'
    );
  END IF;

  DELETE FROM pack_permissions WHERE pack_id = p_pack_id;
  DELETE FROM permission_packs WHERE id = p_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف حزمة الصلاحيات بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء حذف الحزمة: ' || SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION admin_add_pack_permission(
  p_staff_id uuid,
  p_pack_id uuid,
  p_board text,
  p_section text,
  p_access_level text,
  p_actions text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permission_id uuid;
BEGIN
  IF NOT is_platform_admin_by_staff(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بإضافة صلاحيات'
    );
  END IF;

  INSERT INTO pack_permissions (
    pack_id,
    board,
    section,
    access_level,
    actions
  )
  VALUES (
    p_pack_id,
    p_board,
    p_section,
    p_access_level,
    p_actions
  )
  ON CONFLICT (pack_id, board, section) 
  DO UPDATE SET
    access_level = EXCLUDED.access_level,
    actions = EXCLUDED.actions
  RETURNING id INTO v_permission_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إضافة الصلاحية بنجاح',
    'permission_id', v_permission_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء إضافة الصلاحية: ' || SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_pack_permission(
  p_staff_id uuid,
  p_permission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_platform_admin_by_staff(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بحذف صلاحيات'
    );
  END IF;

  DELETE FROM pack_permissions WHERE id = p_permission_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف الصلاحية بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء حذف الصلاحية: ' || SQLERRM
    );
END;
$$;

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

  SELECT jsonb_agg(
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
      'permissions_count', COALESCE(perm_count.count, 0),
      'staff_count', COALESCE(staff_count.count, 0)
    )
  ) INTO v_result
  FROM permission_packs pp
  LEFT JOIN (
    SELECT pack_id, COUNT(*) as count
    FROM pack_permissions
    GROUP BY pack_id
  ) perm_count ON pp.id = perm_count.pack_id
  LEFT JOIN (
    SELECT pack_id, COUNT(*) as count
    FROM platform_staff
    WHERE is_active = true
    GROUP BY pack_id
  ) staff_count ON pp.id = staff_count.pack_id
  ORDER BY pp.created_at DESC;

  RETURN jsonb_build_object(
    'success', true,
    'packs', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_pack_permissions(
  p_staff_id uuid,
  p_pack_id uuid
)
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
      'message', 'غير مصرح لك بعرض الصلاحيات'
    );
  END IF;

  SELECT jsonb_agg(row_to_json(pp)) INTO v_result
  FROM pack_permissions pp
  WHERE pack_id = p_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'permissions', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_clear_pack_permissions(
  p_staff_id uuid,
  p_pack_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_platform_admin_by_staff(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بحذف الصلاحيات'
    );
  END IF;

  DELETE FROM pack_permissions WHERE pack_id = p_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف جميع الصلاحيات بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء حذف الصلاحيات: ' || SQLERRM
    );
END;
$$;
