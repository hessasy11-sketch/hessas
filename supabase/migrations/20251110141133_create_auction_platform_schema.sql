/*
  # منصة الحبر للمزادات الزراعية - القاعدة الأساسية

  ## الجداول الرئيسية
  
  ### 1. profiles (ملفات المستخدمين)
    - `id` (uuid, مربوط بـ auth.users)
    - `phone_number` (رقم الجوال)
    - `display_name` (الاسم)
    - `user_type` (نوع المستخدم: individual, farmer, company, platform_admin, group_owner)
    - `avatar_url` (صورة المستخدم)
    - `created_at` (تاريخ التسجيل)

  ### 2. auction_categories (التصنيفات الفرعية)
    - `id` (uuid)
    - `name_ar` (اسم التصنيف بالعربي)
    - `section` (القسم: public, companies, platform, groups)
    - `icon` (أيقونة التصنيف)
    - `color` (لون التصنيف)
    
  ### 3. auctions (المزادات)
    - `id` (uuid)
    - `owner_id` (صاحب المزاد)
    - `title` (عنوان المزاد)
    - `description` (الوصف)
    - `category_id` (التصنيف)
    - `section` (القسم)
    - `starting_price` (السعر الابتدائي)
    - `current_price` (السعر الحالي)
    - `images` (صور المنتج)
    - `status` (حالة المزاد: upcoming, active, closed, extended)
    - `starts_at` (وقت البداية)
    - `ends_at` (وقت النهاية)
    - `location` (الموقع)
    - `group_id` (للقروبات فقط)
    
  ### 4. bids (المزايدات)
    - `id` (uuid)
    - `auction_id` (المزاد)
    - `bidder_id` (المزايد)
    - `amount` (قيمة المزايدة)
    - `created_at` (وقت المزايدة)
    
  ### 5. chat_messages (رسائل الشات)
    - `id` (uuid)
    - `auction_id` (المزاد)
    - `sender_id` (المرسل)
    - `message` (نص الرسالة)
    - `created_at` (وقت الإرسال)
    
  ### 6. groups (القروبات)
    - `id` (uuid)
    - `owner_id` (صاحب القروب)
    - `name` (اسم القروب)
    - `description` (الوصف)
    - `is_private` (خاص أو عام)
    - `member_count` (عدد الأعضاء)

  ## الأمان
  - تفعيل RLS على جميع الجداول
  - سياسات وصول مناسبة لكل دور
*/

-- الملفات الشخصية
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text UNIQUE NOT NULL,
  display_name text NOT NULL,
  user_type text NOT NULL DEFAULT 'individual' CHECK (user_type IN ('individual', 'farmer', 'company', 'platform_admin', 'group_owner')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- التصنيفات
CREATE TABLE IF NOT EXISTS auction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  section text NOT NULL CHECK (section IN ('public', 'companies', 'platform', 'groups')),
  icon text,
  color text DEFAULT '#10b981',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON auction_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage categories"
  ON auction_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'platform_admin'
    )
  );

-- القروبات
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_private boolean DEFAULT false,
  member_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups"
  ON groups FOR SELECT
  TO authenticated
  USING (NOT is_private OR owner_id = auth.uid());

CREATE POLICY "Group owners can manage their groups"
  ON groups FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- المزادات
CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES auction_categories(id),
  section text NOT NULL CHECK (section IN ('public', 'companies', 'platform', 'groups')),
  starting_price decimal(10,2) NOT NULL DEFAULT 0,
  current_price decimal(10,2) NOT NULL DEFAULT 0,
  images text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'closed', 'extended')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public auctions"
  ON auctions FOR SELECT
  TO authenticated
  USING (
    section != 'groups' OR 
    group_id IN (
      SELECT id FROM groups WHERE NOT is_private OR owner_id = auth.uid()
    )
  );

CREATE POLICY "Auction owners can manage their auctions"
  ON auctions FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- المزايدات
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bids"
  ON bids FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (bidder_id = auth.uid());

-- رسائل الشات
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_auctions_section ON auctions(section);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_owner ON auctions(owner_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_chat_auction ON chat_messages(auction_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC);

-- إضافة بيانات تجريبية للتصنيفات
INSERT INTO auction_categories (name_ar, section, icon, color, sort_order) VALUES
  ('نخيل', 'public', '🌴', '#10b981', 1),
  ('شتلات', 'public', '🌱', '#10b981', 2),
  ('بذور', 'public', '🌾', '#10b981', 3),
  ('معدات زراعية', 'public', '🚜', '#10b981', 4),
  ('حيوانات', 'public', '🐑', '#10b981', 5),
  ('منتجات زراعية', 'companies', '📦', '#3b82f6', 1),
  ('عقود توريد', 'companies', '📋', '#3b82f6', 2),
  ('تملك نخيل', 'platform', '🌴', '#f59e0b', 1),
  ('تملك زيتون', 'platform', '🫒', '#f59e0b', 2),
  ('مقتنيات نادرة', 'platform', '💎', '#f59e0b', 3)
ON CONFLICT DO NOTHING;