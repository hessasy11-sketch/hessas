/*
  # نظام قبول الدعوات الإدارية - Invite Acceptance System

  ## النطاق
  - صفحة: /admin/invite
  - الهدف: قبول دعوة وتفعيل حساب الموظف تلقائياً

  ## الدوال الجديدة
  - `accept_authority_invitation()` - قبول دعوة وتفعيل الحساب
  - `verify_invitation_code()` - التحقق من صحة كود الدعوة

  ## العمليات عند قبول الدعوة:
  1. التحقق من صحة الكود ورقم الجوال
  2. إنشاء/ربط الموظف في platform_staff
  3. تعيين الدور والصلاحيات
  4. تحديث حالة الدعوة إلى accepted
  5. إنشاء Session جديدة
  6. تسجيل في Audit Logs

  ## الأمان
  - التحقق من عدم انتهاء صلاحية الدعوة
  - التحقق من رقم الجوال مطابق للدعوة
  - منع القبول المكرر
*/

-- دالة للتحقق من صحة كود الدعوة
CREATE OR REPLACE FUNCTION verify_invitation_code(
  p_invite_code text,
  p_phone text
)
RETURNS jsonb AS $$
DECLARE
  v_invitation authority_invitations;
BEGIN
  -- جلب الدعوة
  SELECT * INTO v_invitation
  FROM authority_invitations
  WHERE invite_code = p_invite_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'كود الدعوة غير صحيح'
    );
  END IF;

  -- التحقق من رقم الجوال
  IF v_invitation.invitee_phone != p_phone THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'رقم الجوال غير مطابق للدعوة'
    );
  END IF;

  -- التحقق من الحالة
  IF v_invitation.status = 'accepted' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'تم قبول هذه الدعوة مسبقاً'
    );
  END IF;

  IF v_invitation.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'تم إلغاء هذه الدعوة'
    );
  END IF;

  -- التحقق من تاريخ الانتهاء
  IF now() > v_invitation.expires_at THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'انتهت صلاحية هذه الدعوة'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'invitation_id', v_invitation.id,
    'invitee_name', v_invitation.invitee_name,
    'role_code', v_invitation.authority_role,
    'scope_type', v_invitation.scope_type,
    'scope_farm_id', v_invitation.scope_farm_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لقبول الدعوة وتفعيل الحساب
CREATE OR REPLACE FUNCTION accept_authority_invitation(
  p_invite_code text,
  p_phone text,
  p_pin_code text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_invitation authority_invitations;
  v_staff_id uuid;
  v_session_id uuid;
  v_role_info RECORD;
  v_landing_route text;
  v_qr_code text;
  v_staff_code text;
BEGIN
  -- التحقق من صحة الدعوة
  SELECT * INTO v_invitation
  FROM authority_invitations
  WHERE invite_code = p_invite_code
  AND invitee_phone = p_phone
  AND status = 'invited'
  AND now() <= expires_at;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الدعوة غير صالحة أو منتهية الصلاحية'
    );
  END IF;

  -- جلب معلومات الدور
  SELECT * INTO v_role_info
  FROM authority_roles_catalog
  WHERE role_code = v_invitation.authority_role;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الدور غير موجود في الكتالوج'
    );
  END IF;

  -- البحث عن موظف موجود بنفس رقم الجوال
  SELECT id INTO v_staff_id
  FROM platform_staff
  WHERE phone = p_phone;

  -- إذا لم يوجد، إنشاء حساب جديد
  IF v_staff_id IS NULL THEN
    -- توليد QR code فريد
    v_qr_code := 'QR-' || upper(substring(md5(random()::text) from 1 for 12));
    
    -- توليد staff_code فريد
    v_staff_code := 'STF-' || LPAD(nextval('staff_code_seq')::text, 6, '0');

    INSERT INTO platform_staff (
      staff_code,
      name,
      phone,
      role,
      department,
      status,
      qr_code,
      qr_enabled,
      pin_enabled,
      pin_code,
      created_via,
      notes
    ) VALUES (
      v_staff_code,
      v_invitation.invitee_name,
      p_phone,
      v_invitation.authority_role,
      v_role_info.department,
      'active',
      v_qr_code,
      true,
      (p_pin_code IS NOT NULL),
      CASE WHEN p_pin_code IS NOT NULL THEN crypt(p_pin_code, gen_salt('bf')) ELSE NULL END,
      'authority_invitation',
      'تم التعيين عبر دعوة إدارية - كود: ' || p_invite_code
    )
    RETURNING id INTO v_staff_id;
  ELSE
    -- تحديث الموظف الموجود
    UPDATE platform_staff
    SET
      role = v_invitation.authority_role,
      department = v_role_info.department,
      status = 'active',
      qr_enabled = true,
      pin_enabled = (p_pin_code IS NOT NULL),
      pin_code = CASE WHEN p_pin_code IS NOT NULL THEN crypt(p_pin_code, gen_salt('bf')) ELSE pin_code END,
      updated_at = now()
    WHERE id = v_staff_id;
  END IF;

  -- تحديد المسار حسب النطاق والدور
  CASE v_invitation.scope_type
    WHEN 'platform' THEN
      v_landing_route := '/admin/operations-room';
    WHEN 'b2f' THEN
      v_landing_route := '/admin/operations-room/b2f';
    WHEN 'b2b' THEN
      v_landing_route := '/admin/operations-room/b2b';
    WHEN 'farm' THEN
      v_landing_route := '/admin/operations-room/b2f';
    ELSE
      v_landing_route := '/admin/operations-room';
  END CASE;

  -- إذا كان GM، توجه إلى operations-room الرئيسية
  IF v_invitation.authority_role = 'GM' THEN
    v_landing_route := '/admin/operations-room';
  END IF;

  -- إنشاء Session جديدة
  INSERT INTO platform_staff_sessions (
    staff_id,
    login_method,
    device_info,
    ip_address,
    user_agent,
    is_active,
    landing_route,
    started_at,
    last_activity_at
  ) VALUES (
    v_staff_id,
    'invitation_acceptance',
    jsonb_build_object(
      'invitation_code', p_invite_code,
      'accepted_at', now()
    ),
    NULL,
    'Invitation System',
    true,
    v_landing_route,
    now(),
    now()
  )
  RETURNING id INTO v_session_id;

  -- تحديث حالة الدعوة
  UPDATE authority_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by_staff_id = v_staff_id,
    updated_at = now()
  WHERE id = v_invitation.id;

  -- تسجيل في Audit Logs
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by,
    details
  ) VALUES (
    'invitation_accepted',
    'authority_invitation',
    v_invitation.id,
    v_staff_id::text,
    jsonb_build_object(
      'invite_code', p_invite_code,
      'staff_id', v_staff_id,
      'role', v_invitation.authority_role,
      'scope', v_invitation.scope_type,
      'landing_route', v_landing_route
    )
  );

  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم قبول الدعوة وتفعيل حسابك بنجاح',
    'staff_id', v_staff_id,
    'session_id', v_session_id,
    'landing_route', v_landing_route,
    'role_code', v_invitation.authority_role,
    'role_name_ar', v_role_info.role_name_ar,
    'scope_type', v_invitation.scope_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سماح للمستخدمين غير المصادقين بالوصول إلى دالة التحقق
GRANT EXECUTE ON FUNCTION verify_invitation_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_authority_invitation TO anon, authenticated;

-- تعليقات
COMMENT ON FUNCTION verify_invitation_code IS 'التحقق من صحة كود الدعوة ورقم الجوال';
COMMENT ON FUNCTION accept_authority_invitation IS 'قبول دعوة إدارية وتفعيل حساب الموظف تلقائياً';
