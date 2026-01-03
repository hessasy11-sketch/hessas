/*
  # نظام استئجار الأشجار المثمرة (Tree Rental System)

  ## الجداول الجديدة
  
  ### 1. tree_rental_categories (تصنيفات الأشجار)
    - `id` (uuid, primary key)
    - `name` (text) - اسم التصنيف (زيتون، نخيل، مانجا، موز، أخرى)
    - `name_en` (text) - الاسم بالإنجليزية
    - `icon` (text) - أيقونة التصنيف
    - `is_permanent` (boolean) - إذا كان ثابت (مثل "أخرى")
    - `sort_order` (int) - ترتيب العرض
    - `is_active` (boolean) - مفعل أو معطل
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 2. tree_rental_opportunities (فرص الاستئجار)
    - `id` (uuid, primary key)
    - `owner_id` (uuid) - صاحب الفرصة
    - `category_id` (uuid) - التصنيف
    - `title` (text) - عنوان الفرصة
    - `description` (text) - الوصف
    - `tree_type` (text) - نوع الشجرة بالتفصيل
    - `location_city` (text) - المدينة
    - `location_region` (text) - المنطقة
    - `rental_duration_months` (int) - مدة الاستئجار بالأشهر
    - `expected_return` (text) - العائد المتوقع
    - `total_trees` (int) - إجمالي الأشجار المتاحة
    - `reserved_trees` (int) - الأشجار المحجوزة حاليًا
    - `price_per_tree` (decimal) - سعر الشجرة الواحدة
    - `images` (text[]) - صور الفرصة
    - `status` (text) - الحالة: open, full, active, completed
    - `terms_conditions` (text) - الشروط والأحكام
    - `region_id` (uuid) - معرف المنطقة
    - `city_id` (uuid) - معرف المدينة
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 3. tree_rental_reservations (الحجوزات المؤقتة)
    - `id` (uuid, primary key)
    - `opportunity_id` (uuid) - الفرصة المحجوزة
    - `user_id` (uuid, nullable) - المستخدم (إذا كان مسجل)
    - `customer_name` (text) - اسم العميل
    - `customer_phone` (text) - رقم الجوال
    - `number_of_trees` (int) - عدد الأشجار المطلوبة
    - `total_amount` (decimal) - المبلغ الإجمالي
    - `status` (text) - pending, confirmed, cancelled, completed
    - `agreed_to_terms` (boolean) - موافق على الشروط
    - `notes` (text) - ملاحظات
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## الأمان
  
  - RLS مفعّل على جميع الجداول
  - سياسات القراءة للجميع
  - سياسات الكتابة للمستخدمين المصرح لهم
*/

-- ==========================================
-- 1. جدول تصنيفات الأشجار
-- ==========================================

CREATE TABLE IF NOT EXISTS tree_rental_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  icon text,
  is_permanent boolean DEFAULT false,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tree_rental_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON tree_rental_categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage categories"
  ON tree_rental_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إدراج التصنيفات الافتراضية
INSERT INTO tree_rental_categories (name, name_en, icon, is_permanent, sort_order) VALUES
  ('أشجار الزيتون', 'Olive Trees', '🫒', false, 1),
  ('أشجار النخيل', 'Palm Trees', '🌴', false, 2),
  ('أشجار المانجا', 'Mango Trees', '🥭', false, 3),
  ('أشجار الموز', 'Banana Trees', '🍌', false, 4),
  ('أشجار أخرى', 'Other Trees', '🌳', true, 999)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 2. جدول فرص الاستئجار
-- ==========================================

CREATE TABLE IF NOT EXISTS tree_rental_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES tree_rental_categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  tree_type text NOT NULL,
  location_city text,
  location_region text,
  rental_duration_months int DEFAULT 12,
  expected_return text,
  total_trees int NOT NULL CHECK (total_trees > 0),
  reserved_trees int DEFAULT 0 CHECK (reserved_trees >= 0),
  price_per_tree decimal(10,2) DEFAULT 0,
  images text[] DEFAULT '{}',
  status text DEFAULT 'open' CHECK (status IN ('open', 'full', 'active', 'completed')),
  terms_conditions text,
  region_id uuid REFERENCES regions(id),
  city_id uuid REFERENCES cities(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT reserved_not_exceed_total CHECK (reserved_trees <= total_trees)
);

ALTER TABLE tree_rental_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view opportunities"
  ON tree_rental_opportunities
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create opportunities"
  ON tree_rental_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their opportunities"
  ON tree_rental_opportunities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their opportunities"
  ON tree_rental_opportunities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ==========================================
-- 3. جدول الحجوزات المؤقتة
-- ==========================================

CREATE TABLE IF NOT EXISTS tree_rental_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES tree_rental_opportunities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  number_of_trees int NOT NULL CHECK (number_of_trees > 0),
  total_amount decimal(10,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  agreed_to_terms boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tree_rental_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reservations"
  ON tree_rental_reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their reservations"
  ON tree_rental_reservations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR 
    auth.uid() IN (
      SELECT owner_id FROM tree_rental_opportunities
      WHERE tree_rental_opportunities.id = opportunity_id
    )
  );

CREATE POLICY "Opportunity owners can update reservations"
  ON tree_rental_reservations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT owner_id FROM tree_rental_opportunities
      WHERE tree_rental_opportunities.id = opportunity_id
    )
  );

-- ==========================================
-- 4. دالة تحديث الحجوزات تلقائيًا
-- ==========================================

CREATE OR REPLACE FUNCTION update_reserved_trees()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- زيادة العداد عند إضافة حجز جديد
    UPDATE tree_rental_opportunities
    SET 
      reserved_trees = reserved_trees + NEW.number_of_trees,
      status = CASE 
        WHEN reserved_trees + NEW.number_of_trees >= total_trees THEN 'full'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.opportunity_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- تعديل العداد عند تغيير عدد الأشجار
    IF OLD.number_of_trees != NEW.number_of_trees THEN
      UPDATE tree_rental_opportunities
      SET 
        reserved_trees = reserved_trees - OLD.number_of_trees + NEW.number_of_trees,
        updated_at = now()
      WHERE id = NEW.opportunity_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- تقليل العداد عند إلغاء الحجز
    UPDATE tree_rental_opportunities
    SET 
      reserved_trees = reserved_trees - OLD.number_of_trees,
      status = CASE 
        WHEN reserved_trees - OLD.number_of_trees < total_trees THEN 'open'
        ELSE status
      END,
      updated_at = now()
    WHERE id = OLD.opportunity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS update_reserved_trees_trigger ON tree_rental_reservations;
CREATE TRIGGER update_reserved_trees_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tree_rental_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_reserved_trees();

-- ==========================================
-- 5. إنشاء Indexes للأداء
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_tree_opportunities_category ON tree_rental_opportunities(category_id);
CREATE INDEX IF NOT EXISTS idx_tree_opportunities_status ON tree_rental_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_tree_opportunities_region ON tree_rental_opportunities(region_id);
CREATE INDEX IF NOT EXISTS idx_tree_opportunities_city ON tree_rental_opportunities(city_id);
CREATE INDEX IF NOT EXISTS idx_tree_reservations_opportunity ON tree_rental_reservations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_tree_reservations_user ON tree_rental_reservations(user_id);
