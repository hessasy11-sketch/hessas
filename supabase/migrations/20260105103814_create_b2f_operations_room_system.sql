/*
  # نظام غرفة عمليات B2F

  1. جداول جديدة:
     - `decision_queue` - طابور القرارات التنفيذية
     - `executive_logs` - سجل الإجراءات التنفيذية
  
  2. أنواع القرارات:
     - assign_farm_manager - تعيين مدير مزرعة
     - change_farm_manager - تغيير مدير مزرعة
     - pause_farm - إيقاف مزرعة
     - activate_farm - تشغيل مزرعة
     - approve_expense - اعتماد مصروف كبير
     - toggle_bookings - تفعيل/إيقاف حجوزات مزرعة
  
  3. أنواع الإجراءات المسجلة:
     - farm_manager_assigned
     - farm_manager_changed
     - farm_paused
     - farm_activated
     - expense_approved
     - bookings_toggled
*/

-- جدول طابور القرارات
CREATE TABLE IF NOT EXISTS decision_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  target_staff_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  expense_amount numeric(12, 2),
  expense_description text,
  action_data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  requested_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  executed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول السجل التنفيذي
CREATE TABLE IF NOT EXISTS executive_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  decision_id uuid REFERENCES decision_queue(id) ON DELETE SET NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  result text DEFAULT 'success' CHECK (result IN ('success', 'failure', 'partial')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_decision_queue_status ON decision_queue(status);
CREATE INDEX IF NOT EXISTS idx_decision_queue_farm ON decision_queue(farm_id);
CREATE INDEX IF NOT EXISTS idx_decision_queue_priority ON decision_queue(priority);
CREATE INDEX IF NOT EXISTS idx_decision_queue_created ON decision_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executive_logs_farm ON executive_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_executive_logs_action ON executive_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_executive_logs_created ON executive_logs(created_at DESC);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_decision_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decision_queue_updated_at
  BEFORE UPDATE ON decision_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_decision_queue_updated_at();

-- RLS Policies
ALTER TABLE decision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_logs ENABLE ROW LEVEL SECURITY;

-- السماح للـ service role بالقراءة والكتابة
CREATE POLICY "Allow service role full access to decision_queue"
  ON decision_queue FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to executive_logs"
  ON executive_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- السماح للمستخدمين المصادق عليهم بقراءة البيانات
CREATE POLICY "Authenticated users can read decision_queue"
  ON decision_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read executive_logs"
  ON executive_logs FOR SELECT
  TO authenticated
  USING (true);

-- إضافة حقل bookings_enabled للمزارع
ALTER TABLE b2f_farms 
ADD COLUMN IF NOT EXISTS bookings_enabled boolean DEFAULT true;

-- إضافة حقل farm_manager_id للمزارع
ALTER TABLE b2f_farms 
ADD COLUMN IF NOT EXISTS farm_manager_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_farms_manager ON b2f_farms(farm_manager_id);
CREATE INDEX IF NOT EXISTS idx_farms_bookings_enabled ON b2f_farms(bookings_enabled);
