/*
  # إصلاح الجداول المفقودة لغرفة عمليات قيادة المزارع

  1. الجداول المفقودة
    - b2f_decision_queue - قائمة انتظار القرارات
    - fc_activity_timeline - سجل الأنشطة
    
  2. الهدف
    - تشغيل الدوال RPC بشكل فعلي
*/

-- جدول: قائمة انتظار القرارات B2F
CREATE TABLE IF NOT EXISTS b2f_decision_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text,
  requested_by uuid,
  action_data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  executed_at timestamptz,
  execution_result jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_b2f_decision_queue_status ON b2f_decision_queue(status);
CREATE INDEX IF NOT EXISTS idx_b2f_decision_queue_farm_id ON b2f_decision_queue(farm_id);
CREATE INDEX IF NOT EXISTS idx_b2f_decision_queue_priority ON b2f_decision_queue(priority);
CREATE INDEX IF NOT EXISTS idx_b2f_decision_queue_created_at ON b2f_decision_queue(created_at DESC);

-- RLS
ALTER TABLE b2f_decision_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to decision queue"
  ON b2f_decision_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- جدول: سجل الأنشطة للمزارع
CREATE TABLE IF NOT EXISTS fc_activity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  actor_id uuid,
  actor_name text,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_fc_activity_timeline_farm_id ON fc_activity_timeline(farm_id);
CREATE INDEX IF NOT EXISTS idx_fc_activity_timeline_created_at ON fc_activity_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fc_activity_timeline_event_type ON fc_activity_timeline(event_type);

-- RLS
ALTER TABLE fc_activity_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to activity timeline"
  ON fc_activity_timeline
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- التأكد من وجود حقل suspended_at في b2f_farms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN suspended_at timestamptz;
  END IF;
END $$;

-- التأكد من وجود حقل bookings_enabled في b2f_farms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'bookings_enabled'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN bookings_enabled boolean DEFAULT true;
  END IF;
END $$;
