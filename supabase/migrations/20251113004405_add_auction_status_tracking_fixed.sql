/*
  # إضافة نظام تتبع حالة المزادات الذكي

  ## الجداول الجديدة
  
  ### 1. auction_status_history
    - سجل تغييرات حالة المزاد
    - يتتبع كل تحديث يحدث على حالة المزاد
    - يسجل من قام بالتحديث (يدوي أو AI)
    - يحفظ التفاصيل والملاحظات

  ## التحديثات على جدول auctions
    - إضافة عمود ai_status_confidence (درجة ثقة الذكاء الصناعي)
    - إضافة عمود last_ai_check (آخر فحص بالذكاء الصناعي)

  ## الأمان
    - RLS على جدول السجل
    - المستخدمون يرون سجل مزاداتهم فقط
    - الإدارة ترى جميع السجلات
*/

-- إضافة أعمدة جديدة لجدول المزادات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'ai_status_confidence'
  ) THEN
    ALTER TABLE auctions ADD COLUMN ai_status_confidence numeric(3,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'last_ai_check'
  ) THEN
    ALTER TABLE auctions ADD COLUMN last_ai_check timestamptz;
  END IF;
END $$;

-- إنشاء جدول سجل حالة المزادات
CREATE TABLE IF NOT EXISTS auction_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE NOT NULL,
  old_status text,
  new_status text NOT NULL,
  change_reason text,
  updated_by_type text CHECK (updated_by_type IN ('manual', 'ai', 'system')) DEFAULT 'manual',
  updated_by_user uuid REFERENCES profiles(id),
  ai_confidence numeric(3,2),
  ai_analysis jsonb DEFAULT '{}'::jsonb,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auction_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of own auctions"
  ON auction_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = auction_status_history.auction_id
      AND auctions.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all history"
  ON auction_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "System can insert history"
  ON auction_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- دالة لتسجيل تغيير الحالة تلقائياً
CREATE OR REPLACE FUNCTION log_auction_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO auction_status_history (
      auction_id,
      old_status,
      new_status,
      updated_by_type,
      updated_by_user,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      'manual',
      auth.uid(),
      'Status updated'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ربط الدالة بجدول المزادات
DROP TRIGGER IF EXISTS auction_status_change_trigger ON auctions;
CREATE TRIGGER auction_status_change_trigger
  AFTER UPDATE ON auctions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_auction_status_change();

-- دالة للذكاء الصناعي لتحديث حالة المزاد
CREATE OR REPLACE FUNCTION ai_update_auction_status(
  auction_uuid uuid,
  new_status_value text,
  confidence_score numeric,
  analysis_data jsonb,
  reason_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_status_value text;
  result jsonb;
BEGIN
  SELECT status INTO old_status_value FROM auctions WHERE id = auction_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;
  
  UPDATE auctions
  SET
    status = new_status_value,
    ai_status_confidence = confidence_score,
    last_ai_check = now(),
    updated_at = now()
  WHERE id = auction_uuid;
  
  INSERT INTO auction_status_history (
    auction_id,
    old_status,
    new_status,
    change_reason,
    updated_by_type,
    ai_confidence,
    ai_analysis
  ) VALUES (
    auction_uuid,
    old_status_value,
    new_status_value,
    reason_text,
    'ai',
    confidence_score,
    analysis_data
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_status', old_status_value,
    'new_status', new_status_value,
    'confidence', confidence_score
  );
END;
$$;

-- دالة للحصول على آخر 10 تغييرات لمزاد
CREATE OR REPLACE FUNCTION get_auction_status_history(auction_uuid uuid)
RETURNS TABLE (
  id uuid,
  old_status text,
  new_status text,
  change_reason text,
  updated_by_type text,
  ai_confidence numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ash.id,
    ash.old_status,
    ash.new_status,
    ash.change_reason,
    ash.updated_by_type,
    ash.ai_confidence,
    ash.created_at
  FROM auction_status_history ash
  WHERE ash.auction_id = auction_uuid
  ORDER BY ash.created_at DESC
  LIMIT 10;
END;
$$;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_auction_status_history_auction_id ON auction_status_history(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_status_history_created_at ON auction_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_last_ai_check ON auctions(last_ai_check);
