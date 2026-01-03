/*
  # إنشاء نظام الأقسام والتصنيفات الخمسة - على نمط حراج
  
  ## الأقسام الخمسة الرئيسية:
  1. **public** (المزادات العامة) - أخضر زراعي #3AA556
  2. **companies** (مزادات الشركات) - أزرق ملكي #3366CC
  3. **official** (المزادات الرسمية) - ذهبي فاخر #C8A850
  4. **groups** (مزادات القروبات) - برتقالي #D47A2C
  5. **collectibles** (المقتنيات النادرة) - رمادي داكن #333333
  
  ## الجداول:
  1. `categories` - التصنيفات الفرعية لكل قسم
  2. `auctions` - المزادات (مع ربط بالقسم والتصنيف)
  3. `bids` - المزايدات
  4. `groups` - القروبات (للقسم الرابع)
  5. `group_links` - روابط القروبات
  
  ## الأمان:
  - جميع الجداول محمية بـ RLS
  - القراءة متاحة للجميع (authenticated)
  - الكتابة محدودة للمالك أو المدراء
*/

-- ============================================
-- 1. جدول التصنيفات الفرعية
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('public', 'companies', 'official', 'groups', 'collectibles')),
  sub_type text CHECK (sub_type IN ('request', 'offer', NULL)),
  name_ar text NOT NULL,
  icon text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by authenticated users"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Categories manageable by admins only"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- ============================================
-- 2. جدول القروبات (للقسم الرابع فقط)
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  platform text NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  invite_link text NOT NULL,
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups viewable by authenticated users"
  ON groups FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Groups manageable by owner"
  ON groups FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- 3. جدول المزادات
-- ============================================
CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('public', 'companies', 'official', 'groups', 'collectibles')),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  sub_type text CHECK (sub_type IN ('request', 'offer', NULL)),
  title text NOT NULL,
  description text,
  starting_price numeric DEFAULT 0,
  current_price numeric DEFAULT 0,
  images text[] DEFAULT '{}',
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'closed', 'extended')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auctions viewable by authenticated users"
  ON auctions FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN section = 'groups' THEN
        group_id IS NOT NULL
      ELSE
        true
    END
  );

CREATE POLICY "Auctions creatable by authenticated users"
  ON auctions FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Auctions updatable by owner"
  ON auctions FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Auctions deletable by owner"
  ON auctions FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================
-- 4. جدول المزايدات
-- ============================================
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bids viewable by authenticated users"
  ON bids FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Bids creatable by authenticated users"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (bidder_id = auth.uid());

-- ============================================
-- 5. إدراج التصنيفات الافتراضية
-- ============================================

-- القسم الأول: المزادات العامة (أخضر)
INSERT INTO categories (section, name_ar, icon, sort_order) VALUES
('public', 'نخيل', '🌴', 1),
('public', 'شتلات رعوية وبرية', '🌱', 2),
('public', 'أشجار برية', '🌳', 3),
('public', 'أشجار ظل وزينة', '🎋', 4),
('public', 'أشجار نادرة', '🌲', 5),
('public', 'أشجار زيتون', '🫒', 6),
('public', 'معدات زراعية', '⚙️', 7),
('public', 'بذور', '🌾', 8),
('public', 'أسمدة', '💧', 9),
('public', 'مبيدات زراعية', '🧴', 10),
('public', 'خدمات زراعية', '👨‍🌾', 11);

-- القسم الثاني: مزادات الشركات - طلبات (أزرق)
INSERT INTO categories (section, sub_type, name_ar, icon, sort_order) VALUES
('companies', 'request', 'نخيل', '🌴', 1),
('companies', 'request', 'زيتون', '🫒', 2),
('companies', 'request', 'أشجار', '🌳', 3),
('companies', 'request', 'معدات زراعية', '⚙️', 4),
('companies', 'request', 'بذور', '🌾', 5),
('companies', 'request', 'أسمدة', '💧', 6),
('companies', 'request', 'مبيدات زراعية', '🧴', 7),
('companies', 'request', 'خدمات زراعية', '👨‍🌾', 8);

-- القسم الثاني: مزادات الشركات - عروض (أزرق)
INSERT INTO categories (section, sub_type, name_ar, icon, sort_order) VALUES
('companies', 'offer', 'نخيل', '🌴', 1),
('companies', 'offer', 'زيتون', '🫒', 2),
('companies', 'offer', 'أشجار', '🌳', 3),
('companies', 'offer', 'معدات زراعية', '⚙️', 4),
('companies', 'offer', 'بذور', '🌾', 5),
('companies', 'offer', 'أسمدة', '💧', 6),
('companies', 'offer', 'مبيدات زراعية', '🧴', 7),
('companies', 'offer', 'خدمات زراعية', '👨‍🌾', 8);

-- القسم الثالث: المزادات الرسمية (ذهبي)
INSERT INTO categories (section, name_ar, icon, sort_order) VALUES
('official', 'تملك النخيل', '🌴', 1),
('official', 'تملك الزيتون', '🫒', 2),
('official', 'تملك العقارات الزراعية', '🏡', 3),
('official', 'مزادات أخرى', '🌟', 4),
('official', 'مقتنيات نادرة', '⚜️', 5);

-- القسم الرابع: مزادات القروبات (برتقالي)
INSERT INTO categories (section, name_ar, icon, sort_order) VALUES
('groups', 'نخيل', '🌴', 1),
('groups', 'شتلات رعوية', '🌱', 2),
('groups', 'أشجار برية', '🌳', 3),
('groups', 'أشجار ظل وزينة', '🎋', 4),
('groups', 'زيتون', '🫒', 5),
('groups', 'معدات زراعية', '⚙️', 6),
('groups', 'بذور', '🌾', 7),
('groups', 'أسمدة', '💧', 8),
('groups', 'مبيدات زراعية', '🧴', 9),
('groups', 'خدمات زراعية', '👨‍🌾', 10);

-- القسم الخامس: المقتنيات النادرة (رمادي)
INSERT INTO categories (section, name_ar, icon, sort_order) VALUES
('collectibles', 'أدوات ومعدات قديمة', '🧰', 1),
('collectibles', 'بذور نادرة', '🌾', 2),
('collectibles', 'منتجات تراثية', '🧺', 3),
('collectibles', 'تحف وصور زراعية', '🖼️', 4),
('collectibles', 'مقتنيات فاخرة', '💎', 5);

-- ============================================
-- 6. إنشاء Indexes للأداء
-- ============================================
CREATE INDEX IF NOT EXISTS idx_categories_section ON categories(section);
CREATE INDEX IF NOT EXISTS idx_categories_section_subtype ON categories(section, sub_type);
CREATE INDEX IF NOT EXISTS idx_auctions_section ON auctions(section);
CREATE INDEX IF NOT EXISTS idx_auctions_category ON auctions(category_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_group ON auctions(group_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id);
