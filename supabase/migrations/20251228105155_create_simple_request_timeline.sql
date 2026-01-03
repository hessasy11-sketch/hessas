/*
  # إنشاء جدول Timeline بسيط للطلبات

  1. الجدول
    - `b2f_request_timeline` - للطلبات المباشرة

  2. الحقول
    - request_id: ربط مباشر بـ b2f_investment_requests
*/

CREATE TABLE IF NOT EXISTS b2f_request_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  metadata JSONB,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2f_request_timeline_request_id ON b2f_request_timeline(request_id);
CREATE INDEX IF NOT EXISTS idx_b2f_request_timeline_created_at ON b2f_request_timeline(created_at DESC);

ALTER TABLE b2f_request_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read timeline" ON b2f_request_timeline FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert timeline" ON b2f_request_timeline FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can manage timeline" ON b2f_request_timeline FOR ALL TO authenticated USING (true);
