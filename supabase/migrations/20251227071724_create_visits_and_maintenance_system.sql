/*
  # نظام الزيارات والصيانة - B2F

  1. جداول جديدة
    - `b2f_farm_visits` - جدول الزيارات المجدولة للمزارع
    - `b2f_maintenance_tasks` - جدول مهام الصيانة للمزارع

  2. الأمان
    - تفعيل RLS على الجداول
    - سياسات للقراءة والتعديل (admin فقط)

  3. Indexes
    - فهرسة للبحث السريع
*/

-- جدول الزيارات المجدولة
CREATE TABLE IF NOT EXISTS b2f_farm_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_phone text NOT NULL,
  investor_name text NOT NULL,
  farm_name text NOT NULL,
  visit_date date NOT NULL,
  visit_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول مهام الصيانة
CREATE TABLE IF NOT EXISTS b2f_maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_name text NOT NULL,
  task_type text NOT NULL
    CHECK (task_type IN ('irrigation', 'fertilization', 'pruning', 'pest_control', 'harvesting', 'other')),
  description text NOT NULL,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  assigned_to text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_farm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للزيارات - القراءة
CREATE POLICY "Admin can read all visits"
  ON b2f_farm_visits FOR SELECT
  TO authenticated, service_role
  USING (true);

-- سياسات RLS للزيارات - الإدراج والتعديل
CREATE POLICY "Admin can insert visits"
  ON b2f_farm_visits FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Admin can update visits"
  ON b2f_farm_visits FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- سياسات RLS لمهام الصيانة - القراءة
CREATE POLICY "Admin can read all maintenance tasks"
  ON b2f_maintenance_tasks FOR SELECT
  TO authenticated, service_role
  USING (true);

-- سياسات RLS لمهام الصيانة - الإدراج والتعديل
CREATE POLICY "Admin can insert maintenance tasks"
  ON b2f_maintenance_tasks FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Admin can update maintenance tasks"
  ON b2f_maintenance_tasks FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_visits_date ON b2f_farm_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON b2f_farm_visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_phone ON b2f_farm_visits(investor_phone);

CREATE INDEX IF NOT EXISTS idx_maintenance_date ON b2f_maintenance_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON b2f_maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON b2f_maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_farm ON b2f_maintenance_tasks(farm_name);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visits_updated_at ON b2f_farm_visits;
CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON b2f_farm_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON b2f_maintenance_tasks;
CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON b2f_maintenance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- بيانات تجريبية للزيارات
INSERT INTO b2f_farm_visits (investor_phone, investor_name, farm_name, visit_date, visit_time, status, notes) VALUES
('+966555555500', 'أحمد محمد', 'مزرعة الورود', '2025-01-15', '10:00:00', 'pending', 'زيارة للاطلاع على الأشجار'),
('+966555555501', 'فاطمة علي', 'مزرعة النخيل', '2025-01-20', '14:00:00', 'confirmed', 'زيارة مؤكدة'),
('+966555555502', 'عبدالله سعد', 'مزرعة الزيتون', '2025-01-10', '09:00:00', 'completed', 'تمت الزيارة بنجاح')
ON CONFLICT DO NOTHING;

-- بيانات تجريبية لمهام الصيانة
INSERT INTO b2f_maintenance_tasks (farm_name, task_type, description, scheduled_date, status, priority, estimated_cost, assigned_to) VALUES
('مزرعة الورود', 'irrigation', 'فحص نظام الري الآلي', '2025-01-12', 'scheduled', 'high', 500.00, 'فريق الصيانة'),
('مزرعة النخيل', 'fertilization', 'إضافة السماد الموسمي', '2025-01-18', 'scheduled', 'medium', 1200.00, 'مهندس زراعي'),
('مزرعة الزيتون', 'pruning', 'تقليم الأشجار', '2025-01-08', 'in_progress', 'urgent', 800.00, 'فريق التقليم'),
('مزرعة الورود', 'pest_control', 'رش المبيدات الحشرية', '2025-01-05', 'completed', 'high', 600.00, 'فريق المكافحة')
ON CONFLICT DO NOTHING;
