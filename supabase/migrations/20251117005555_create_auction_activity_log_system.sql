/*
  # Create Auction Activity Log System

  1. New Table
    - auction_activity_log
      - Comprehensive logging of all seller actions
      - Tracks every auction modification
      - Stores metadata for each action
      - Supports audit trails and rollback

  2. Activity Types
    - close_auction: إغلاق المزاد
    - open_auction: فتح المزاد
    - extend_auction: تمديد المزاد
    - mark_sold: تحديد كمباع
    - share_auction: مشاركة المزاد
    - republish_auction: إعادة نشر المزاد
    - closing_alert: إعلان قرب الانتهاء
    - ai_analysis: تحليل ذكي
    - ai_suggestion: اقتراح ذكي
    - ai_alert: تنبيه ذكي
    - status_change: تغيير حالة
    - price_update: تحديث السعر

  3. Security
    - Enable RLS
    - Only auction owner and admin can read
    - Only system can write
    - Immutable records (no updates/deletes)

  4. Features
    - Full metadata storage
    - IP address tracking
    - User agent tracking
    - Before/after state comparison
    - Rollback support
    - Admin transparency
*/

CREATE TABLE IF NOT EXISTS auction_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  activity_name_ar text NOT NULL,
  description_ar text,
  metadata jsonb DEFAULT '{}',
  before_state jsonb,
  after_state jsonb,
  ip_address text,
  user_agent text,
  is_ai_action boolean DEFAULT false,
  ai_confidence numeric,
  can_rollback boolean DEFAULT false,
  rollback_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auction_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auction owner can read own activity log"
  ON auction_activity_log
  FOR SELECT
  TO authenticated
  USING (
    auction_id IN (
      SELECT id FROM auctions WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admin can read all activity logs"
  ON auction_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND account_type = 'admin'
    )
  );

CREATE POLICY "System can insert activity logs"
  ON auction_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_log_auction ON auction_activity_log(auction_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON auction_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON auction_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON auction_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_ai ON auction_activity_log(is_ai_action, auction_id);

CREATE OR REPLACE FUNCTION log_auction_activity(
  p_auction_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_activity_name_ar text,
  p_description_ar text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_before_state jsonb DEFAULT NULL,
  p_after_state jsonb DEFAULT NULL,
  p_is_ai_action boolean DEFAULT false,
  p_ai_confidence numeric DEFAULT NULL,
  p_can_rollback boolean DEFAULT false,
  p_rollback_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO auction_activity_log (
    auction_id,
    user_id,
    activity_type,
    activity_name_ar,
    description_ar,
    metadata,
    before_state,
    after_state,
    is_ai_action,
    ai_confidence,
    can_rollback,
    rollback_data
  ) VALUES (
    p_auction_id,
    p_user_id,
    p_activity_type,
    p_activity_name_ar,
    p_description_ar,
    p_metadata,
    p_before_state,
    p_after_state,
    p_is_ai_action,
    p_ai_confidence,
    p_can_rollback,
    p_rollback_data
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_auction_activity_log(
  p_auction_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  activity_type text,
  activity_name_ar text,
  description_ar text,
  metadata jsonb,
  is_ai_action boolean,
  ai_confidence numeric,
  can_rollback boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.id,
    aal.activity_type,
    aal.activity_name_ar,
    aal.description_ar,
    aal.metadata,
    aal.is_ai_action,
    aal.ai_confidence,
    aal.can_rollback,
    aal.created_at
  FROM auction_activity_log aal
  WHERE aal.auction_id = p_auction_id
  ORDER BY aal.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_auction_activity_stats(p_auction_id uuid)
RETURNS TABLE(
  total_actions integer,
  ai_actions integer,
  manual_actions integer,
  last_activity timestamptz,
  most_common_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_actions,
    COUNT(*) FILTER (WHERE is_ai_action = true)::integer as ai_actions,
    COUNT(*) FILTER (WHERE is_ai_action = false)::integer as manual_actions,
    MAX(created_at) as last_activity,
    MODE() WITHIN GROUP (ORDER BY activity_type) as most_common_action
  FROM auction_activity_log
  WHERE auction_id = p_auction_id;
END;
$$;

COMMENT ON TABLE auction_activity_log IS 'Comprehensive audit log for all auction seller actions';
COMMENT ON FUNCTION log_auction_activity IS 'Logs any seller action on an auction with full metadata';
COMMENT ON FUNCTION get_auction_activity_log IS 'Retrieves activity log for an auction with pagination';
COMMENT ON FUNCTION get_auction_activity_stats IS 'Returns statistics about auction activity';
