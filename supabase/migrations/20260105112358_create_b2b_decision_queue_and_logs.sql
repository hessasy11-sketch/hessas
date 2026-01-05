/*
  # نظام قرارات وسجل B2B (Auctions)

  ## الحدود الصارمة
  - هذا النظام خاص بالمزادات ONLY
  - لا علاقة له بالمزارع (B2F) نهائياً

  ## الجداول الجديدة

  ### 1. b2b_decision_queue
  طابور القرارات الخاصة بالمزادات:
  - auction_id - معرف المزاد
  - decision_type - نوع القرار
  - auction_title - عنوان المزاد
  - status, priority, notes

  ### 2. b2b_executive_logs
  سجل الإجراءات التنفيذية للمزادات:
  - auction_id - معرف المزاد
  - action_type - نوع الإجراء
  - action_data - بيانات الإجراء
  - performed_by - من نفذ الإجراء

  ## أنواع القرارات المسموحة (B2B ONLY):
  - pause_auction - إيقاف مزاد
  - activate_auction - تفعيل مزاد
  - extend_auction - تمديد مزاد
  - cancel_auction - إلغاء مزاد
  - approve_auction_result - اعتماد نتيجة مزاد
  - remove_auction - سحب مزاد
  - review_auction - مراجعة مزاد

  ## أنواع الإجراءات المسموحة (B2B ONLY):
  - auction_paused - مزاد موقف
  - auction_activated - مزاد مفعّل
  - auction_extended - مزاد ممدد
  - auction_cancelled - مزاد ملغى
  - auction_result_approved - نتيجة مزاد معتمدة
  - auction_removed - مزاد مسحوب
  - auction_reviewed - مزاد مراجع
*/

-- ============================================
-- 1. جدول طابور قرارات المزادات
-- ============================================

CREATE TABLE IF NOT EXISTS b2b_decision_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- معلومات المزاد
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  auction_title text,

  -- نوع القرار (auction operations only)
  decision_type text NOT NULL CHECK (decision_type IN (
    'pause_auction',
    'activate_auction',
    'extend_auction',
    'cancel_auction',
    'approve_auction_result',
    'remove_auction',
    'review_auction'
  )),

  -- بيانات إضافية
  action_data jsonb DEFAULT '{}'::jsonb,

  -- الحالة والأولوية
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- من طلب ومن وافق
  requested_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,

  -- التنفيذ
  executed_at timestamptz,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. جدول سجل إجراءات المزادات
-- ============================================

CREATE TABLE IF NOT EXISTS b2b_executive_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- نوع الإجراء (auction actions only)
  action_type text NOT NULL CHECK (action_type IN (
    'auction_paused',
    'auction_activated',
    'auction_extended',
    'auction_cancelled',
    'auction_result_approved',
    'auction_removed',
    'auction_reviewed',
    'auction_time_extended'
  )),

  -- معلومات المزاد
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,

  -- بيانات الإجراء
  decision_id uuid REFERENCES b2b_decision_queue(id) ON DELETE SET NULL,
  action_data jsonb DEFAULT '{}'::jsonb,

  -- من نفذ الإجراء
  performed_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,

  -- النتيجة
  result text DEFAULT 'success' CHECK (result IN ('success', 'failure', 'partial')),
  notes text,

  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. الفهارس
-- ============================================

CREATE INDEX IF NOT EXISTS idx_b2b_decision_queue_status ON b2b_decision_queue(status);
CREATE INDEX IF NOT EXISTS idx_b2b_decision_queue_auction ON b2b_decision_queue(auction_id);
CREATE INDEX IF NOT EXISTS idx_b2b_decision_queue_priority ON b2b_decision_queue(priority);
CREATE INDEX IF NOT EXISTS idx_b2b_decision_queue_created ON b2b_decision_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_executive_logs_auction ON b2b_executive_logs(auction_id);
CREATE INDEX IF NOT EXISTS idx_b2b_executive_logs_action ON b2b_executive_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_b2b_executive_logs_created ON b2b_executive_logs(created_at DESC);

-- ============================================
-- 4. Trigger لتحديث updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_b2b_decision_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b2b_decision_queue_updated_at
  BEFORE UPDATE ON b2b_decision_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_b2b_decision_queue_updated_at();

-- ============================================
-- 5. RLS Policies
-- ============================================

ALTER TABLE b2b_decision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_executive_logs ENABLE ROW LEVEL SECURITY;

-- Service role
CREATE POLICY "Service role full access to b2b_decision_queue"
  ON b2b_decision_queue FOR ALL
  USING (true);

CREATE POLICY "Service role full access to b2b_executive_logs"
  ON b2b_executive_logs FOR ALL
  USING (true);

-- Authenticated users
CREATE POLICY "Authenticated users can read b2b_decision_queue"
  ON b2b_decision_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read b2b_executive_logs"
  ON b2b_executive_logs FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 6. دالة الحصول على قرارات المزادات المعلقة
-- ============================================

CREATE OR REPLACE FUNCTION get_pending_b2b_decisions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decisions_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', dq.id,
      'decision_type', dq.decision_type,
      'auction_id', dq.auction_id,
      'auction_title', COALESCE(dq.auction_title, a.title),
      'action_data', dq.action_data,
      'status', dq.status,
      'priority', dq.priority,
      'requested_by', dq.requested_by,
      'requester_name', ps.full_name,
      'notes', dq.notes,
      'created_at', dq.created_at
    )
    ORDER BY
      CASE dq.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      dq.created_at ASC
  )
  INTO decisions_list
  FROM b2b_decision_queue dq
  LEFT JOIN auctions a ON a.id = dq.auction_id
  LEFT JOIN platform_staff ps ON ps.id = dq.requested_by
  WHERE dq.status = 'pending';

  RETURN COALESCE(decisions_list, '[]'::jsonb);
END;
$$;

-- ============================================
-- 7. دالة الحصول على سجل إجراءات المزادات
-- ============================================

CREATE OR REPLACE FUNCTION get_b2b_executive_logs(
  limit_count integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  logs_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', el.id,
      'action_type', el.action_type,
      'auction_id', el.auction_id,
      'action_data', el.action_data,
      'performed_by', el.performed_by,
      'performer_name', ps.full_name,
      'result', el.result,
      'notes', el.notes,
      'created_at', el.created_at
    )
    ORDER BY el.created_at DESC
  )
  INTO logs_list
  FROM (
    SELECT *
    FROM b2b_executive_logs
    ORDER BY created_at DESC
    LIMIT limit_count
  ) el
  LEFT JOIN platform_staff ps ON ps.id = el.performed_by;

  RETURN COALESCE(logs_list, '[]'::jsonb);
END;
$$;

-- ============================================
-- 8. منح صلاحيات التنفيذ
-- ============================================

GRANT EXECUTE ON FUNCTION get_pending_b2b_decisions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_b2b_executive_logs TO anon, authenticated;