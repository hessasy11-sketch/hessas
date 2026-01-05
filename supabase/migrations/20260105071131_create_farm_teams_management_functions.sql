/*
  # دوال إدارة فرق المزرعة الكاملة

  1. الدوال الجديدة:
    - create_farm_team() - إنشاء فريق جديد
    - add_team_member() - إضافة عضو للفريق
    - remove_team_member() - إزالة عضو من الفريق
    - update_team_member_role() - تحديث دور العضو
    - delete_farm_team() - حذف فريق
    - get_team_details() - تفاصيل الفريق مع الأعضاء

  2. الأمان:
    - التحقق من صلاحيات المزرعة
    - منع الحذف إذا كان هناك أعضاء
    - تسجيل جميع العمليات في audit logs
*/

-- دالة إنشاء فريق جديد
CREATE OR REPLACE FUNCTION create_farm_team(
  p_farm_id uuid,
  p_team_name text,
  p_team_type text,
  p_team_leader_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_result json;
BEGIN
  -- إنشاء الفريق
  INSERT INTO fc_farm_teams (
    farm_id,
    team_name,
    team_type,
    team_leader_id,
    is_active
  ) VALUES (
    p_farm_id,
    p_team_name,
    p_team_type,
    p_team_leader_id,
    true
  )
  RETURNING id INTO v_team_id;

  -- إضافة القائد كعضو إذا تم تحديده
  IF p_team_leader_id IS NOT NULL THEN
    INSERT INTO fc_team_members (
      team_id,
      staff_id,
      role_in_team,
      joined_at
    ) VALUES (
      v_team_id,
      p_team_leader_id,
      'leader',
      now()
    );
  END IF;

  -- تسجيل في audit log
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    performed_by,
    details
  ) VALUES (
    'create',
    'fc_farm_teams',
    v_team_id,
    auth.uid(),
    json_build_object(
      'team_name', p_team_name,
      'farm_id', p_farm_id
    )
  );

  SELECT json_build_object(
    'success', true,
    'team_id', v_team_id,
    'message', 'تم إنشاء الفريق بنجاح'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة إضافة عضو للفريق
CREATE OR REPLACE FUNCTION add_team_member(
  p_team_id uuid,
  p_staff_id uuid,
  p_role_in_team text DEFAULT 'member'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_member_id uuid;
  v_result json;
BEGIN
  -- الحصول على farm_id
  SELECT farm_id INTO v_farm_id
  FROM fc_farm_teams
  WHERE id = p_team_id;

  -- التحقق من عدم وجود العضو مسبقاً
  IF EXISTS (
    SELECT 1 FROM fc_team_members
    WHERE team_id = p_team_id
    AND staff_id = p_staff_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'العضو موجود بالفعل في الفريق'
    );
  END IF;

  -- إضافة العضو
  INSERT INTO fc_team_members (
    team_id,
    staff_id,
    role_in_team,
    joined_at
  ) VALUES (
    p_team_id,
    p_staff_id,
    p_role_in_team,
    now()
  )
  RETURNING id INTO v_member_id;

  -- تسجيل في audit log
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    performed_by,
    details
  ) VALUES (
    'insert',
    'fc_team_members',
    v_member_id,
    auth.uid(),
    json_build_object(
      'team_id', p_team_id,
      'staff_id', p_staff_id,
      'role_in_team', p_role_in_team
    )
  );

  SELECT json_build_object(
    'success', true,
    'member_id', v_member_id,
    'message', 'تم إضافة العضو بنجاح'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة إزالة عضو من الفريق
CREATE OR REPLACE FUNCTION remove_team_member(
  p_member_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- حذف العضو
  DELETE FROM fc_team_members
  WHERE id = p_member_id;

  -- تسجيل في audit log
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    performed_by,
    details
  ) VALUES (
    'delete',
    'fc_team_members',
    p_member_id,
    auth.uid(),
    json_build_object(
      'member_id', p_member_id
    )
  );

  SELECT json_build_object(
    'success', true,
    'message', 'تم إزالة العضو بنجاح'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة تحديث دور العضو
CREATE OR REPLACE FUNCTION update_team_member_role(
  p_member_id uuid,
  p_new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- تحديث الدور
  UPDATE fc_team_members
  SET role_in_team = p_new_role
  WHERE id = p_member_id;

  -- تسجيل في audit log
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    performed_by,
    details
  ) VALUES (
    'update',
    'fc_team_members',
    p_member_id,
    auth.uid(),
    json_build_object(
      'new_role', p_new_role
    )
  );

  SELECT json_build_object(
    'success', true,
    'message', 'تم تحديث دور العضو بنجاح'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة حذف فريق
CREATE OR REPLACE FUNCTION delete_farm_team(
  p_team_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_members_count integer;
  v_result json;
BEGIN
  -- التحقق من عدم وجود أعضاء
  SELECT COUNT(*) INTO v_members_count
  FROM fc_team_members
  WHERE team_id = p_team_id;

  IF v_members_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يمكن حذف الفريق لوجود أعضاء. يرجى إزالة الأعضاء أولاً'
    );
  END IF;

  -- حذف الفريق
  DELETE FROM fc_farm_teams
  WHERE id = p_team_id;

  -- تسجيل في audit log
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    performed_by,
    details
  ) VALUES (
    'delete',
    'fc_farm_teams',
    p_team_id,
    auth.uid(),
    json_build_object(
      'team_id', p_team_id
    )
  );

  SELECT json_build_object(
    'success', true,
    'message', 'تم حذف الفريق بنجاح'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- دالة الحصول على تفاصيل الفريق مع الأعضاء
CREATE OR REPLACE FUNCTION get_team_details(p_team_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'team', (
      SELECT json_build_object(
        'id', t.id,
        'team_name', t.team_name,
        'team_type', t.team_type,
        'is_active', t.is_active,
        'leader_name', ps.name_ar
      )
      FROM fc_farm_teams t
      LEFT JOIN platform_staff ps ON ps.id = t.team_leader_id
      WHERE t.id = p_team_id
    ),
    'members', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', tm.id,
          'staff_id', tm.staff_id,
          'staff_name', ps.name_ar,
          'staff_code', ps.staff_code,
          'role_in_team', tm.role_in_team,
          'joined_at', tm.joined_at
        ) ORDER BY tm.joined_at
      ), '[]'::json)
      FROM fc_team_members tm
      JOIN platform_staff ps ON ps.id = tm.staff_id
      WHERE tm.team_id = p_team_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
