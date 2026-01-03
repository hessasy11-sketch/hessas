/*
  # إضافة جداول التحليلات والإشراف للمزادات

  1. جداول جديدة
    - `auction_views`: تسجيل مشاهدات المزادات
      - `id` (uuid, primary key)
      - `auction_id` (uuid, foreign key)
      - `viewer_id` (uuid, nullable, foreign key)
      - `viewed_at` (timestamptz)
      - `ip_address` (text)
      
    - `auction_reports`: بلاغات عن المستخدمين في المزادات
      - `id` (uuid, primary key)
      - `auction_id` (uuid, foreign key)
      - `reporter_id` (uuid, foreign key)
      - `reported_user_id` (uuid, foreign key)
      - `reason` (text)
      - `message_id` (uuid, nullable)
      - `status` (text: pending, reviewed, resolved)
      - `created_at` (timestamptz)
      
    - `auction_blocks`: حظر مستخدمين من المزادات
      - `id` (uuid, primary key)
      - `auction_id` (uuid, foreign key)
      - `blocked_user_id` (uuid, foreign key)
      - `blocked_by` (uuid, foreign key)
      - `reason` (text)
      - `created_at` (timestamptz)
      
    - `seller_ratings`: تقييمات البائعين
      - `id` (uuid, primary key)
      - `seller_id` (uuid, foreign key)
      - `rater_id` (uuid, foreign key)
      - `auction_id` (uuid, foreign key)
      - `rating` (integer 1-5)
      - `comment` (text, nullable)
      - `created_at` (timestamptz)

  2. تحديثات على جدول auctions
    - إضافة `views_count` (integer)
    - إضافة `bidders_count` (integer)
    - إضافة `last_activity_at` (timestamptz)

  3. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات قراءة للجميع للمشاهدات
    - سياسات خاصة للبلاغات والحظر (البائع والإدارة)
    - سياسات التقييمات للمصادقين فقط
*/

-- إضافة أعمدة جديدة لجدول auctions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE auctions ADD COLUMN views_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'bidders_count'
  ) THEN
    ALTER TABLE auctions ADD COLUMN bidders_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE auctions ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;
END $$;

-- جدول مشاهدات المزادات
CREATE TABLE IF NOT EXISTS auction_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now(),
  ip_address text,
  UNIQUE(auction_id, viewer_id, viewed_at)
);

ALTER TABLE auction_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auction views"
  ON auction_views FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert auction views"
  ON auction_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- جدول بلاغات المزادات
CREATE TABLE IF NOT EXISTS auction_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  message_id uuid,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auction_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auction owners can view reports for their auctions"
  ON auction_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = auction_reports.auction_id
      AND auctions.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports"
  ON auction_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- جدول حظر المستخدمين
CREATE TABLE IF NOT EXISTS auction_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(auction_id, blocked_user_id)
);

ALTER TABLE auction_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auction owners can view blocks for their auctions"
  ON auction_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = auction_blocks.auction_id
      AND auctions.owner_id = auth.uid()
    )
  );

CREATE POLICY "Auction owners can block users"
  ON auction_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = auction_blocks.auction_id
      AND auctions.owner_id = auth.uid()
    )
    AND auth.uid() = blocked_by
  );

CREATE POLICY "Auction owners can unblock users"
  ON auction_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = auction_blocks.auction_id
      AND auctions.owner_id = auth.uid()
    )
  );

-- جدول تقييمات البائعين
CREATE TABLE IF NOT EXISTS seller_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(auction_id, rater_id)
);

ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON seller_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create ratings"
  ON seller_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users can update their own ratings"
  ON seller_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = rater_id)
  WITH CHECK (auth.uid() = rater_id);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_auction_views_auction_id ON auction_views(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_views_viewer_id ON auction_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_auction_reports_auction_id ON auction_reports(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_reports_status ON auction_reports(status);
CREATE INDEX IF NOT EXISTS idx_auction_blocks_auction_id ON auction_blocks(auction_id);
CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller_id ON seller_ratings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_ratings_auction_id ON seller_ratings(auction_id);

-- دالة لتحديث عداد المشاهدات
CREATE OR REPLACE FUNCTION update_auction_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auctions
  SET views_count = views_count + 1
  WHERE id = NEW.auction_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auction_view_insert
  AFTER INSERT ON auction_views
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_views_count();

-- دالة لتحديث آخر نشاط
CREATE OR REPLACE FUNCTION update_auction_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auctions
  SET last_activity_at = now()
  WHERE id = NEW.auction_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_activity();