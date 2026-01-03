/*
  # إضافة staff_code ونظام الصلاحيات

  1. إضافة حقول جديدة لجدول platform_staff:
    - staff_code: الرقم الإداري (A-00001)
    - full_name: الاسم الكامل
    - phone_number: رقم الجوال (للبحث السريع)

  2. إنشاء جدول staff_permissions:
    - جدول الصلاحيات التفصيلية للموظفين
    - قوالب الصلاحيات الجاهزة
    - مفاتيح التخصيص الإضافية

  3. Security:
    - RLS على جدول staff_permissions
*/

-- إضافة الحقول الجديدة إلى platform_staff
DO $$
BEGIN
  -- إضافة staff_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'staff_code'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN staff_code text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_platform_staff_staff_code ON platform_staff(staff_code);
  END IF;

  -- إضافة full_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN full_name text;
  END IF;

  -- إضافة phone_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN phone_number text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_platform_staff_phone ON platform_staff(phone_number);
  END IF;

  -- إضافة reports_to
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'reports_to'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN reports_to text;
  END IF;
END $$;

-- تحديث qr_token إلى qr_code للتوافق
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'qr_token'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE platform_staff RENAME COLUMN qr_token TO qr_code;
  END IF;
END $$;

-- إنشاء جدول staff_permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES platform_staff(id) ON DELETE CASCADE NOT NULL,

  -- قالب الصلاحية المختار
  permission_template text NOT NULL DEFAULT 'admin_staff',

  -- مفاتيح التخصيص الإضافية
  can_create_tasks boolean DEFAULT false,
  can_approve_tasks boolean DEFAULT false,
  can_send_reports boolean DEFAULT false,

  -- البيانات الوصفية
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- قيد فريد: موظف واحد له صلاحية واحدة فقط
  UNIQUE(staff_id)
);

-- إضافة تعليقات
COMMENT ON TABLE staff_permissions IS 'صلاحيات الموظفين التفصيلية';
COMMENT ON COLUMN staff_permissions.permission_template IS 'قالب الصلاحية: super_admin, department_manager, admin_staff, farm_manager, operations_supervisor, investor_service, finance2';

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_template ON staff_permissions(permission_template);

-- تفعيل RLS
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- سياسات RLS بسيطة: الكل يمكنه القراءة، فقط service_role يمكنه التعديل
CREATE POLICY "Allow read access to all authenticated"
  ON staff_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow full access to service role"
  ON staff_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_staff_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS staff_permissions_updated_at ON staff_permissions;
CREATE TRIGGER staff_permissions_updated_at
  BEFORE UPDATE ON staff_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_permissions_updated_at();

-- دالة مساعدة للحصول على صلاحيات موظف
CREATE OR REPLACE FUNCTION get_staff_permissions(p_staff_id uuid)
RETURNS TABLE (
  template text,
  can_create_tasks boolean,
  can_approve_tasks boolean,
  can_send_reports boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.permission_template,
    sp.can_create_tasks,
    sp.can_approve_tasks,
    sp.can_send_reports
  FROM staff_permissions sp
  WHERE sp.staff_id = p_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT SELECT ON staff_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_permissions(uuid) TO authenticated;