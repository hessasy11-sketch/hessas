/*
  # إنشاء جدول b2f_farm_operations

  ## الغرض
  - جدول لتتبع العمليات الزراعية على مستوى المزرعة
  - يستخدم لإدارة المراحل والتحديثات التشغيلية

  ## الحقول
  - id: معرف فريد
  - farm_id: ربط بالمزرعة
  - season_name: اسم الموسم
  - start_date: تاريخ البدء
  - end_date: تاريخ الانتهاء المتوقع
  - current_phase: المرحلة الحالية
  - progress_percentage: نسبة الإنجاز
  - is_active: هل التشغيل نشط
  - created_at: تاريخ الإنشاء
  - updated_at: تاريخ التحديث

  ## الأمان
  - تفعيل RLS
  - سياسات قراءة للجميع
  - سياسات كتابة للموظفين فقط
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_farm_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  season_name text NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  current_phase text DEFAULT 'preparation',
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_farm_operations ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع
CREATE POLICY "Anyone can view farm operations"
  ON b2f_farm_operations
  FOR SELECT
  USING (true);

-- سياسة الإضافة: للموظفين
CREATE POLICY "Staff can insert farm operations"
  ON b2f_farm_operations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.is_active = true
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager', 'farm_manager', 'operations_manager')
    )
  );

-- سياسة التحديث: للموظفين
CREATE POLICY "Staff can update farm operations"
  ON b2f_farm_operations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.is_active = true
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager', 'farm_manager', 'operations_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.is_active = true
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager', 'farm_manager', 'operations_manager')
    )
  );

-- سياسة الحذف: للموظفين
CREATE POLICY "Staff can delete farm operations"
  ON b2f_farm_operations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.is_active = true
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager', 'farm_manager', 'operations_manager')
    )
  );

-- فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_farm_operations_farm_id ON b2f_farm_operations(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_operations_is_active ON b2f_farm_operations(is_active);

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_farm_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger لتحديث updated_at تلقائياً
CREATE TRIGGER update_b2f_farm_operations_timestamp
  BEFORE UPDATE ON b2f_farm_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_farm_operations_updated_at();

COMMENT ON TABLE b2f_farm_operations IS 'جدول العمليات الزراعية على مستوى المزرعة';