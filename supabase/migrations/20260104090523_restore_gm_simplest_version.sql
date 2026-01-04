/*
  # إعادة إنشاء المدير العام - النسخة الأبسط
*/

-- 1. توسيع constraint
ALTER TABLE roles_catalog DROP CONSTRAINT IF EXISTS roles_catalog_permission_level_check;
ALTER TABLE roles_catalog ADD CONSTRAINT roles_catalog_permission_level_check
CHECK (permission_level = ANY (ARRAY['read', 'execute', 'approve', 'manage', 'super_admin']));

-- 2. إعادة إنشاء المدير العام
INSERT INTO platform_staff (
  id,
  full_name,
  staff_code,
  role,
  department,
  phone_number,
  qr_code,
  qr_is_active,
  requires_pin,
  pin_code,
  is_active
) VALUES (
  '50ff70ee-db37-4bcd-b1ef-11d4fa05dfba',
  'المدير العام',
  'GM-001',
  'super_admin',
  'HQ',
  '0500000000',
  'GM-QR-2026-001',
  true,
  true,
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  qr_is_active = true,
  is_active = true;

-- 3. إضافة قسم HQ
INSERT INTO platform_departments (code, name_ar, name_en, is_active)
VALUES ('HQ', 'المقر الرئيسي', 'Headquarters', true)
ON CONFLICT (code) DO NOTHING;

-- 4. تعيين المدير العام للقسم
INSERT INTO department_staff_assignments (department_id, staff_id, is_primary)
SELECT 
  (SELECT id FROM platform_departments WHERE code = 'HQ' LIMIT 1),
  '50ff70ee-db37-4bcd-b1ef-11d4fa05dfba',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM department_staff_assignments
  WHERE staff_id = '50ff70ee-db37-4bcd-b1ef-11d4fa05dfba'
);

-- 5. دالة check_role_permissions
CREATE OR REPLACE FUNCTION check_role_permissions(p_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_role = 'super_admin' THEN
    RETURN jsonb_build_object(
      'has_full_access', true,
      'role', 'super_admin',
      'is_active', true
    );
  END IF;
  RETURN (SELECT jsonb_build_object('role_name', role_name, 'is_active', is_active)
    FROM roles_catalog WHERE role_name = p_role AND is_active = true LIMIT 1);
END; $$;

GRANT EXECUTE ON FUNCTION check_role_permissions(text) TO authenticated, anon, service_role;

-- 6. التحقق
SELECT 
  ps.full_name,
  ps.staff_code,
  ps.role,
  ps.qr_code,
  COUNT(dsa.id) as assignments
FROM platform_staff ps
LEFT JOIN department_staff_assignments dsa ON ps.id = dsa.staff_id
GROUP BY ps.id, ps.full_name, ps.staff_code, ps.role, ps.qr_code
ORDER BY ps.full_name;
