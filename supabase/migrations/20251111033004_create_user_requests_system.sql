/*
  # إنشاء نظام طلبات المستخدمين

  1. الجداول الجديدة
    - `user_purchase_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text) - عنوان الطلب
      - `description` (text) - وصف الطلب
      - `category_id` (uuid, foreign key to categories) - التصنيف
      - `quantity` (text) - الكمية المطلوبة
      - `budget` (numeric) - الميزانية التقديرية
      - `location` (text) - موقع التسليم
      - `delivery_date` (timestamptz) - تاريخ التسليم المطلوب
      - `status` (text) - حالة الطلب (active, under_review, completed, closed)
      - `offers_count` (integer) - عدد العروض
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `purchase_offers`
      - `id` (uuid, primary key)
      - `request_id` (uuid, foreign key to user_purchase_requests)
      - `supplier_id` (uuid, foreign key to auth.users)
      - `price` (numeric) - السعر المعروض
      - `delivery_time` (text) - وقت التسليم
      - `notes` (text) - ملاحظات العرض
      - `status` (text) - حالة العرض (pending, accepted, rejected)
      - `created_at` (timestamptz)

    - `user_auction_participation`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `auction_id` (uuid, foreign key to auctions)
      - `highest_bid` (numeric) - أعلى مزايدة للمستخدم
      - `bid_count` (integer) - عدد المزايدات
      - `is_winner` (boolean) - هل فاز بالمزاد
      - `last_bid_at` (timestamptz) - وقت آخر مزايدة
      - `created_at` (timestamptz)

    - `user_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `activity_type` (text) - نوع النشاط
      - `activity_description` (text) - وصف النشاط
      - `reference_id` (uuid) - معرف مرجعي
      - `created_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات للقراءة والكتابة للمستخدمين المصادقين
*/

-- إنشاء جدول طلبات الشراء
CREATE TABLE IF NOT EXISTS user_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id),
  quantity text,
  budget numeric(10, 2),
  location text,
  delivery_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'completed', 'closed')),
  offers_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول العروض على طلبات الشراء
CREATE TABLE IF NOT EXISTS purchase_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES user_purchase_requests(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  price numeric(10, 2) NOT NULL,
  delivery_time text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول مشاركات المزادات
CREATE TABLE IF NOT EXISTS user_auction_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE NOT NULL,
  highest_bid numeric(10, 2) NOT NULL,
  bid_count integer DEFAULT 1,
  is_winner boolean DEFAULT false,
  last_bid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, auction_id)
);

-- إنشاء جدول سجل الأنشطة
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  activity_description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE user_purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_auction_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- سياسات user_purchase_requests
CREATE POLICY "Users can view own purchase requests"
  ON user_purchase_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchase requests"
  ON user_purchase_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase requests"
  ON user_purchase_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view active purchase requests"
  ON user_purchase_requests FOR SELECT
  TO authenticated
  USING (status = 'active');

-- سياسات purchase_offers
CREATE POLICY "Request owners can view offers"
  ON purchase_offers FOR SELECT
  TO authenticated
  USING (
    request_id IN (
      SELECT id FROM user_purchase_requests WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can view own offers"
  ON purchase_offers FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can create offers"
  ON purchase_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = supplier_id);

-- سياسات user_auction_participation
CREATE POLICY "Users can view own auction participation"
  ON user_auction_participation FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create auction participation"
  ON user_auction_participation FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own auction participation"
  ON user_auction_participation FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- سياسات user_activities
CREATE POLICY "Users can view own activities"
  ON user_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create activities"
  ON user_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_purchase_requests_user_id ON user_purchase_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON user_purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_offers_request_id ON purchase_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_offers_supplier_id ON purchase_offers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_auction_participation_user_id ON user_auction_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_participation_auction_id ON user_auction_participation(auction_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_requests_updated_at
  BEFORE UPDATE ON user_purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إنشاء trigger لتحديث عدد العروض
CREATE OR REPLACE FUNCTION update_offers_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_purchase_requests
  SET offers_count = (
    SELECT COUNT(*) FROM purchase_offers WHERE request_id = NEW.request_id
  )
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offers_count_trigger
  AFTER INSERT ON purchase_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_count();
