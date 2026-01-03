/*
  # جدول الخط الزمني للعمليات التشغيلية
  
  1. الجدول الجديد
    - `operation_timeline` - لتتبع جميع أحداث التشغيل
    
  2. الحقول
    - id: معرف فريد
    - reservation_id: ربط بالحجز
    - event_type: نوع الحدث
    - event_title: عنوان الحدث
    - event_description: وصف الحدث
    - created_by: من أضاف الحدث (user/admin/system)
    - created_at: تاريخ الحدث
    
  3. الأمان
    - RLS policies
*/

-- جدول الخط الزمني
CREATE TABLE IF NOT EXISTS operation_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES investment_reservations(id) ON DELETE CASCADE,
  
  -- معلومات الحدث
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  
  -- البيانات الإضافية
  metadata JSONB,
  
  -- من أضاف الحدث
  created_by TEXT DEFAULT 'system',
  
  -- التوقيت
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operation_timeline_reservation_id 
ON operation_timeline(reservation_id);

CREATE INDEX IF NOT EXISTS idx_operation_timeline_event_type 
ON operation_timeline(event_type);

CREATE INDEX IF NOT EXISTS idx_operation_timeline_created_at 
ON operation_timeline(created_at DESC);

-- RLS
ALTER TABLE operation_timeline ENABLE ROW LEVEL SECURITY;

-- المستثمرون يمكنهم قراءة الأحداث الخاصة بحجوزاتهم
CREATE POLICY "Investors can read their timeline"
  ON operation_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investment_reservations
      WHERE investment_reservations.id = operation_timeline.reservation_id
      AND investment_reservations.user_id = auth.uid()
    )
  );

-- السماح للمستخدمين المصادق عليهم بإضافة أحداث
CREATE POLICY "Authenticated users can insert timeline events"
  ON operation_timeline FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- المستخدمون المصادق عليهم يمكنهم إدارة الأحداث
CREATE POLICY "Authenticated users can manage timeline"
  ON operation_timeline FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE operation_timeline IS 'الخط الزمني لأحداث التشغيل والمتابعة';
COMMENT ON COLUMN operation_timeline.event_type IS 'نوع الحدث: update_requested, status_changed, contact_made, visit_scheduled, etc.';
COMMENT ON COLUMN operation_timeline.created_by IS 'من أضاف الحدث: user, admin, system';
