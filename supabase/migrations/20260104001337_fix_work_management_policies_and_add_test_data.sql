/*
  # إصلاح صلاحيات نظام إدارة العمل وإضافة بيانات تجريبية

  1. إصلاح RLS Policies
    - إضافة صلاحيات أفضل للإدارة العليا
    - إصلاح INSERT policies لجميع الجداول
    
  2. بيانات تجريبية
    - حزم صلاحيات جاهزة
    - قوالب مهام
    - فرق عمل
*/

-- إصلاح policies لـ permission_packs
DROP POLICY IF EXISTS "Super admins can manage permission packs" ON permission_packs;
DROP POLICY IF EXISTS "Service role full access to permission packs" ON permission_packs;

CREATE POLICY "Platform admins full access to permission packs"
  ON permission_packs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  );

CREATE POLICY "Service role full access to permission packs"
  ON permission_packs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إصلاح policies لـ pack_permissions
DROP POLICY IF EXISTS "Super admins can manage pack permissions" ON pack_permissions;
DROP POLICY IF EXISTS "Service role full access to pack permissions" ON pack_permissions;

CREATE POLICY "Platform admins full access to pack permissions"
  ON pack_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  );

CREATE POLICY "Service role full access to pack permissions"
  ON pack_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إصلاح policies لـ task_templates
DROP POLICY IF EXISTS "Super admins can manage task templates" ON task_templates;
DROP POLICY IF EXISTS "Service role full access to task templates" ON task_templates;

CREATE POLICY "Platform admins full access to task templates"
  ON task_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  );

CREATE POLICY "Service role full access to task templates"
  ON task_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إصلاح policies لـ staff_tasks
DROP POLICY IF EXISTS "Admins can manage all tasks" ON staff_tasks;

CREATE POLICY "Platform admins full access to tasks"
  ON staff_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  );

-- إصلاح policies لـ staff_teams
DROP POLICY IF EXISTS "Admins can manage teams" ON staff_teams;
DROP POLICY IF EXISTS "Service role full access to teams" ON staff_teams;

CREATE POLICY "Platform admins full access to teams"
  ON staff_teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  );

CREATE POLICY "Service role full access to teams"
  ON staff_teams FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إصلاح policies لـ team_members
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Service role full access to team members" ON team_members;

CREATE POLICY "Platform admins full access to team members"
  ON team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'general_manager')
      AND platform_staff.is_active = true
    )
  );

CREATE POLICY "Service role full access to team members"
  ON team_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إضافة بيانات تجريبية - حزم صلاحيات
INSERT INTO permission_packs (name, description, target_boards, requires_pin, landing_route, is_active)
VALUES 
  (
    'مدير المزادات الرئيسي',
    'صلاحيات كاملة لإدارة المزادات والموافقات المالية',
    ARRAY['b2b'],
    true,
    '/admin/auctions',
    true
  ),
  (
    'مدير المزارع',
    'صلاحيات كاملة لإدارة المزارع والفرص الاستثمارية',
    ARRAY['b2f'],
    true,
    '/admin/b2f',
    true
  ),
  (
    'موظف المزادات',
    'صلاحيات عرض وإدارة المزادات بدون موافقات',
    ARRAY['b2b'],
    false,
    '/admin/auctions',
    true
  ),
  (
    'موظف خدمة العملاء',
    'صلاحيات عرض البيانات والرد على الاستفسارات',
    ARRAY['b2b', 'b2f'],
    false,
    '/hq',
    true
  ),
  (
    'محاسب',
    'صلاحيات المالية والموافقات المالية',
    ARRAY['b2b', 'b2f'],
    true,
    '/admin/b2f',
    true
  )
ON CONFLICT DO NOTHING;

-- إضافة بيانات تجريبية - قوالب مهام
INSERT INTO task_templates (name, description, board, section, requires_proof, requires_approval, send_report_on_approval, checklist_items, estimated_duration_minutes, priority, is_active)
VALUES 
  (
    'مراجعة مزاد جديد',
    'مراجعة والموافقة على مزاد جديد قبل نشره',
    'b2b',
    'المزادات',
    true,
    true,
    true,
    ARRAY['فحص البيانات الأساسية', 'التحقق من الصور', 'مراجعة الأسعار', 'الموافقة النهائية'],
    30,
    'high',
    true
  ),
  (
    'مراجعة طلب استثمار',
    'مراجعة طلب استثمار في المزارع',
    'b2f',
    'الطلبات',
    true,
    true,
    true,
    ARRAY['مراجعة بيانات المستثمر', 'التحقق من الدفع', 'مراجعة العقد', 'إصدار الشهادة'],
    45,
    'urgent',
    true
  ),
  (
    'تحديث بيانات مزرعة',
    'تحديث بيانات ومعلومات المزرعة',
    'b2f',
    'المزارع',
    true,
    false,
    false,
    ARRAY['تحديث الصور', 'تحديث الوصف', 'تحديث الأسعار'],
    20,
    'medium',
    true
  ),
  (
    'الرد على استفسار عميل',
    'الرد على استفسار أو شكوى عميل',
    'general',
    'خدمة العملاء',
    false,
    false,
    false,
    ARRAY['قراءة الاستفسار', 'البحث عن الحل', 'الرد على العميل'],
    15,
    'medium',
    true
  ),
  (
    'مراجعة عملية موسمية',
    'مراجعة واعتماد عملية موسمية في المزرعة',
    'operations',
    'العمليات الموسمية',
    true,
    true,
    true,
    ARRAY['فحص التقرير', 'مراجعة الصور', 'التحقق من المهام', 'الموافقة'],
    60,
    'high',
    true
  )
ON CONFLICT DO NOTHING;

-- إضافة بيانات تجريبية - فرق عمل
DO $$
DECLARE
  v_team_b2b_id uuid;
  v_team_b2f_id uuid;
  v_team_cs_id uuid;
BEGIN
  -- فريق المزادات
  INSERT INTO staff_teams (name, description, department, is_active)
  VALUES ('فريق المزادات', 'فريق متخصص في إدارة المزادات', 'b2b', true)
  RETURNING id INTO v_team_b2b_id;

  -- فريق المزارع
  INSERT INTO staff_teams (name, description, department, is_active)
  VALUES ('فريق المزارع والاستثمار', 'فريق متخصص في إدارة المزارع والفرص الاستثمارية', 'b2f', true)
  RETURNING id INTO v_team_b2f_id;

  -- فريق خدمة العملاء
  INSERT INTO staff_teams (name, description, department, is_active)
  VALUES ('فريق خدمة العملاء', 'فريق متخصص في خدمة العملاء والدعم الفني', 'support', true)
  RETURNING id INTO v_team_cs_id;
  
  -- تخزين IDs للاستخدام المستقبلي
  RAISE NOTICE 'Teams created successfully';
END $$;

-- Function لإنشاء موظف بسهولة
CREATE OR REPLACE FUNCTION create_staff_member(
  p_full_name text,
  p_phone text,
  p_role_title text,
  p_department text,
  p_pack_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id uuid;
  v_pack_id uuid;
  v_qr_code text;
  v_pin_code text;
  v_requires_pin boolean := false;
BEGIN
  -- Generate QR code
  v_qr_code := 'QR_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8);
  
  -- Get pack if specified
  IF p_pack_name IS NOT NULL THEN
    SELECT id, requires_pin INTO v_pack_id, v_requires_pin
    FROM permission_packs
    WHERE name = p_pack_name
    LIMIT 1;
    
    -- Generate PIN if required
    IF v_requires_pin THEN
      v_pin_code := lpad(floor(random() * 10000)::text, 4, '0');
    END IF;
  END IF;
  
  -- Insert staff member
  INSERT INTO platform_staff (
    full_name,
    phone,
    role,
    role_title,
    department,
    pack_id,
    qr_code,
    pin_code,
    requires_pin,
    qr_is_active,
    is_active
  )
  VALUES (
    p_full_name,
    p_phone,
    'staff',
    p_role_title,
    p_department,
    v_pack_id,
    v_qr_code,
    v_pin_code,
    v_requires_pin,
    true,
    true
  )
  RETURNING id INTO v_staff_id;
  
  RETURN v_staff_id;
END;
$$;
