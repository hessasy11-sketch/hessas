/*
  # إنشاء نظام الدعوات الإدارية - Authority Invitations System

  ## النطاق
  - صفحة: /admin/operations-room → Authority Panel
  - الهدف: السماح للمدير العام بدعوة وتعيين موظفين غير مسجلين

  ## الجداول الجديدة

  ### `authority_invitations`
  - `id` (uuid, primary key)
  - `invite_code` (text, unique) - كود الدعوة
  - `invitee_name` (text) - اسم المدعو
  - `invitee_phone` (text) - رقم جوال المدعو
  - `authority_role` (text) - الدور المطلوب (من roles catalog)
  - `scope_type` (text) - نطاق الصلاحية (platform, b2f, b2b, farm)
  - `scope_farm_id` (uuid, nullable) - معرف المزرعة (عند scope=farm)
  - `status` (text) - حالة الدعوة (invited, accepted, expired, cancelled)
  - `notes` (text) - ملاحظات من المُدعي
  - `invited_by` (text) - من قام بالدعوة
  - `invited_at` (timestamptz) - وقت الدعوة
  - `expires_at` (timestamptz) - تاريخ انتهاء الدعوة
  - `accepted_at` (timestamptz, nullable)
  - `accepted_by_staff_id` (uuid, nullable)

  ## الأمان
  - RLS enabled
  - القراءة: للمسؤولين فقط
  - الكتابة: للمسؤولين فقط

  ## الدوال
  - `create_authority_invitation()` - إنشاء دعوة جديدة
  - `get_active_invitations()` - جلب الدعوات النشطة
  - `cancel_invitation()` - إلغاء دعوة
*/

-- إنشاء جدول الدعوات الإدارية
CREATE TABLE IF NOT EXISTS authority_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text UNIQUE NOT NULL,
  invitee_name text NOT NULL,
  invitee_phone text NOT NULL,
  authority_role text NOT NULL REFERENCES authority_roles_catalog(role_code),
  scope_type text NOT NULL CHECK (scope_type IN ('platform', 'b2f', 'b2b', 'farm')),
  scope_farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'expired', 'cancelled')),
  notes text,
  invited_by text NOT NULL,
  invited_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_staff_id uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- فهرس على invite_code للبحث السريع
CREATE INDEX IF NOT EXISTS idx_authority_invitations_invite_code ON authority_invitations(invite_code);

-- فهرس على حالة الدعوة
CREATE INDEX IF NOT EXISTS idx_authority_invitations_status ON authority_invitations(status);

-- فهرس على رقم الجوال
CREATE INDEX IF NOT EXISTS idx_authority_invitations_phone ON authority_invitations(invitee_phone);

-- تفعيل RLS
ALTER TABLE authority_invitations ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: للمسؤولين فقط
CREATE POLICY "Admins can view invitations"
  ON authority_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'general_manager')
    )
  );

-- سياسة الإدراج: للمسؤولين فقط
CREATE POLICY "Admins can create invitations"
  ON authority_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'general_manager')
    )
  );

-- سياسة التحديث: للمسؤولين فقط
CREATE POLICY "Admins can update invitations"
  ON authority_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'general_manager')
    )
  );

-- دالة لتوليد كود دعوة فريد
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  
  -- تأكد من عدم وجود تكرار
  WHILE EXISTS (SELECT 1 FROM authority_invitations WHERE invite_code = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء دعوة جديدة
CREATE OR REPLACE FUNCTION create_authority_invitation(
  p_invitee_name text,
  p_invitee_phone text,
  p_authority_role text,
  p_scope_type text,
  p_scope_farm_id uuid DEFAULT NULL,
  p_invited_by text DEFAULT 'system',
  p_notes text DEFAULT NULL,
  p_expiry_days int DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_invite_code text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- التحقق من وجود الدور في الكتالوج
  IF NOT EXISTS (SELECT 1 FROM authority_roles_catalog WHERE role_code = p_authority_role) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الدور غير موجود في الكتالوج'
    );
  END IF;

  -- التحقق من scope_farm_id إذا كان النطاق farm
  IF p_scope_type = 'farm' AND p_scope_farm_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'يجب تحديد المزرعة عند اختيار نطاق Farm'
    );
  END IF;

  -- توليد كود الدعوة
  v_invite_code := generate_invite_code();
  
  -- حساب تاريخ الانتهاء
  v_expires_at := now() + (p_expiry_days || ' days')::interval;

  -- إنشاء الدعوة
  INSERT INTO authority_invitations (
    invite_code,
    invitee_name,
    invitee_phone,
    authority_role,
    scope_type,
    scope_farm_id,
    status,
    notes,
    invited_by,
    expires_at
  ) VALUES (
    v_invite_code,
    p_invitee_name,
    p_invitee_phone,
    p_authority_role,
    p_scope_type,
    p_scope_farm_id,
    'invited',
    p_notes,
    p_invited_by,
    v_expires_at
  )
  RETURNING id INTO v_invitation_id;

  -- تسجيل في السجل
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by,
    details
  ) VALUES (
    'authority_invitation_created',
    'authority_invitation',
    v_invitation_id,
    p_invited_by,
    jsonb_build_object(
      'invitee_name', p_invitee_name,
      'invitee_phone', p_invitee_phone,
      'role', p_authority_role,
      'scope', p_scope_type,
      'invite_code', v_invite_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'invite_code', v_invite_code,
    'expires_at', v_expires_at,
    'message', 'تم إنشاء الدعوة بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على الدعوات النشطة
CREATE OR REPLACE FUNCTION get_active_invitations(p_include_expired boolean DEFAULT false)
RETURNS TABLE (
  id uuid,
  invite_code text,
  invitee_name text,
  invitee_phone text,
  authority_role text,
  role_name_ar text,
  role_name_en text,
  scope_type text,
  scope_farm_id uuid,
  farm_name text,
  status text,
  notes text,
  invited_by text,
  invited_at timestamptz,
  expires_at timestamptz,
  is_expired boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    inv.id,
    inv.invite_code,
    inv.invitee_name,
    inv.invitee_phone,
    inv.authority_role,
    r.role_name_ar,
    r.role_name_en,
    inv.scope_type,
    inv.scope_farm_id,
    f.name as farm_name,
    inv.status,
    inv.notes,
    inv.invited_by,
    inv.invited_at,
    inv.expires_at,
    (now() > inv.expires_at) as is_expired
  FROM authority_invitations inv
  LEFT JOIN authority_roles_catalog r ON r.role_code = inv.authority_role
  LEFT JOIN b2f_farms f ON f.id = inv.scope_farm_id
  WHERE 
    inv.status IN ('invited', 'accepted')
    AND (p_include_expired = true OR now() <= inv.expires_at)
  ORDER BY inv.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإلغاء دعوة
CREATE OR REPLACE FUNCTION cancel_invitation(
  p_invitation_id uuid,
  p_cancelled_by text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_invitation authority_invitations;
BEGIN
  -- جلب معلومات الدعوة
  SELECT * INTO v_invitation
  FROM authority_invitations
  WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الدعوة غير موجودة'
    );
  END IF;

  IF v_invitation.status != 'invited' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا يمكن إلغاء دعوة بحالة ' || v_invitation.status
    );
  END IF;

  -- تحديث حالة الدعوة
  UPDATE authority_invitations
  SET 
    status = 'cancelled',
    notes = COALESCE(notes || E'\n\n', '') || 'تم الإلغاء: ' || COALESCE(p_reason, 'بدون سبب'),
    updated_at = now()
  WHERE id = p_invitation_id;

  -- تسجيل في السجل
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by,
    details
  ) VALUES (
    'authority_invitation_cancelled',
    'authority_invitation',
    p_invitation_id,
    p_cancelled_by,
    jsonb_build_object(
      'reason', p_reason,
      'invite_code', v_invitation.invite_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إلغاء الدعوة بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_authority_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS authority_invitations_updated_at ON authority_invitations;
CREATE TRIGGER authority_invitations_updated_at
  BEFORE UPDATE ON authority_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_authority_invitations_updated_at();

-- إضافة تعليقات
COMMENT ON TABLE authority_invitations IS 'دعوات التعيين الإداري - يتم إرسالها للموظفين غير المسجلين';
COMMENT ON COLUMN authority_invitations.invite_code IS 'كود الدعوة الفريد (8 أحرف وأرقام)';
COMMENT ON COLUMN authority_invitations.scope_type IS 'نطاق الصلاحية: platform (كامل), b2f, b2b, أو farm (مزرعة معينة)';
COMMENT ON COLUMN authority_invitations.expires_at IS 'تاريخ انتهاء صلاحية الدعوة';
