/*
  # إنشاء جدول العروض الاستثمارية الكامل

  1. الجدول الرئيسي
    - `b2f_opportunities` - جدول العروض الاستثمارية بجميع الحقول
  
  2. الحقول
    - id (uuid)
    - farm_id (uuid) - مرتبط بجدول farms
    - title (text) - عنوان العرض
    - description (text) - الوصف
    - tree_type (text) - نوع الشجرة
    - custom_tree_type (text) - نوع مخصص
    - investment_type (text) - نوع الاستثمار
    - price_per_tree (numeric) - السعر لكل شجرة
    - min_trees (integer) - الحد الأدنى من الأشجار
    - max_trees (integer) - الحد الأقصى
    - available_trees (integer) - الأشجار المتاحة
    - contract_duration_years (integer) - مدة العقد
    - expected_return (text) - العائد المتوقع
    - badge (text) - الشارة
    - internal_tag (text) - علامة داخلية
    - video_url (text) - رابط الفيديو
    - location_url (text) - رابط الموقع
    - images (text[]) - الصور
    - status (text) - الحالة
    - is_active (boolean) - نشط
    - created_at (timestamptz)
    - updated_at (timestamptz)

  3. الأمان
    - RLS مفعل
    - سياسات للعرض العام
    - سياسات للإدارة (admins فقط)
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  tree_type text NOT NULL DEFAULT 'نخيل',
  custom_tree_type text,
  investment_type text NOT NULL DEFAULT 'rental',
  price_per_tree numeric(10,2) NOT NULL DEFAULT 189.00,
  min_trees integer NOT NULL DEFAULT 3,
  max_trees integer,
  available_trees integer NOT NULL DEFAULT 100,
  contract_duration_years integer NOT NULL DEFAULT 10,
  expected_return text,
  badge text DEFAULT 'none' CHECK (badge IN ('none', 'exclusive', 'limited', 'featured')),
  internal_tag text,
  video_url text,
  location_url text,
  images text[] DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'sold_out')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_opportunities ENABLE ROW LEVEL SECURITY;

-- سياسات العرض العام
CREATE POLICY "Public can view active opportunities"
  ON b2f_opportunities FOR SELECT
  TO public
  USING (status = 'active' AND is_active = true);

-- سياسات الإدارة
CREATE POLICY "Admins can view all opportunities"
  ON b2f_opportunities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

CREATE POLICY "Admins can insert opportunities"
  ON b2f_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

CREATE POLICY "Admins can update opportunities"
  ON b2f_opportunities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

CREATE POLICY "Admins can delete opportunities"
  ON b2f_opportunities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_farm_id ON b2f_opportunities(farm_id);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_tree_type ON b2f_opportunities(tree_type);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_status ON b2f_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_badge ON b2f_opportunities(badge);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_is_active ON b2f_opportunities(is_active);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_b2f_opportunities_updated_at_trigger ON b2f_opportunities;
CREATE TRIGGER update_b2f_opportunities_updated_at_trigger
  BEFORE UPDATE ON b2f_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_opportunities_updated_at();

-- Trigger لمزامنة status و is_active
CREATE OR REPLACE FUNCTION auto_sync_b2f_opportunity_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    NEW.is_active := true;
  ELSE
    NEW.is_active := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_sync_b2f_opportunity_status_trigger ON b2f_opportunities;
CREATE TRIGGER auto_sync_b2f_opportunity_status_trigger
  BEFORE INSERT OR UPDATE ON b2f_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_b2f_opportunity_status();

-- ===============================================
-- دالة حساب الأشجار المحجوزة
-- ===============================================

CREATE OR REPLACE FUNCTION get_b2f_opportunity_reserved_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reserved_count integer;
BEGIN
  SELECT COALESCE(SUM(number_of_trees), 0)::integer
  INTO reserved_count
  FROM investment_reservations
  WHERE opportunity_id = opportunity_id_param
    AND status IN ('pending', 'approved', 'active');
  
  RETURN COALESCE(reserved_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- ===============================================
-- دالة حساب الأشجار المتبقية
-- ===============================================

CREATE OR REPLACE FUNCTION get_b2f_opportunity_remaining_trees(opportunity_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_available integer;
  total_reserved integer;
BEGIN
  SELECT available_trees
  INTO total_available
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  IF total_available IS NULL OR total_available = 0 THEN
    RETURN 0;
  END IF;
  
  total_reserved := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  
  RETURN GREATEST(total_available - total_reserved, 0);
END;
$$;

-- ===============================================
-- دالة إحصائيات العرض الشاملة
-- ===============================================

CREATE OR REPLACE FUNCTION get_b2f_opportunity_statistics(opportunity_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_available integer;
  total_reserved integer;
  total_remaining integer;
  reservation_count integer;
BEGIN
  SELECT available_trees
  INTO total_available
  FROM b2f_opportunities
  WHERE id = opportunity_id_param;
  
  total_reserved := get_b2f_opportunity_reserved_trees(opportunity_id_param);
  total_remaining := get_b2f_opportunity_remaining_trees(opportunity_id_param);
  
  SELECT COUNT(*)::integer
  INTO reservation_count
  FROM investment_reservations
  WHERE opportunity_id = opportunity_id_param
    AND status IN ('pending', 'approved', 'active');
  
  result := json_build_object(
    'available_trees', COALESCE(total_available, 0),
    'reserved_trees', total_reserved,
    'remaining_trees', total_remaining,
    'reservation_count', reservation_count,
    'is_full', (total_remaining = 0)
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'available_trees', 0,
      'reserved_trees', 0,
      'remaining_trees', 0,
      'reservation_count', 0,
      'is_full', false
    );
END;
$$;

-- ===============================================
-- دالة نسخ عرض موجود
-- ===============================================

CREATE OR REPLACE FUNCTION duplicate_b2f_opportunity(opportunity_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_opportunity_id uuid;
BEGIN
  INSERT INTO b2f_opportunities (
    farm_id,
    title,
    description,
    tree_type,
    custom_tree_type,
    investment_type,
    price_per_tree,
    min_trees,
    max_trees,
    available_trees,
    contract_duration_years,
    expected_return,
    badge,
    internal_tag,
    video_url,
    location_url,
    images,
    status,
    is_active
  )
  SELECT 
    farm_id,
    title || ' (نسخة)',
    description,
    tree_type,
    custom_tree_type,
    investment_type,
    price_per_tree,
    min_trees,
    max_trees,
    available_trees,
    contract_duration_years,
    expected_return,
    badge,
    internal_tag,
    video_url,
    location_url,
    images,
    'hidden',
    false
  FROM b2f_opportunities
  WHERE id = opportunity_id_param
  RETURNING id INTO new_opportunity_id;
  
  RETURN new_opportunity_id;
END;
$$;

-- إضافة عروض تجريبية
INSERT INTO b2f_opportunities (
  farm_id,
  title,
  description,
  tree_type,
  investment_type,
  available_trees,
  price_per_tree,
  min_trees,
  max_trees,
  contract_duration_years,
  expected_return,
  badge,
  status,
  is_active
)
SELECT 
  f.id,
  'استثمار 10 سنوات في ' || 
    CASE 
      WHEN f.tree_type = 'أخرى' AND f.custom_tree_type IS NOT NULL THEN f.custom_tree_type
      ELSE f.tree_type
    END || ' - ' || f.location,
  'فرصة استثمارية طويلة الأمد بإدارة كاملة من المنصة. استثمر في ' ||
    CASE 
      WHEN f.tree_type = 'أخرى' AND f.custom_tree_type IS NOT NULL THEN f.custom_tree_type
      ELSE f.tree_type
    END || ' عالي الجودة واحصل على عوائد مستدامة.',
  f.tree_type,
  'rental',
  50,
  189.00,
  3,
  NULL,
  10,
  'عائد متوقع: 15-20% سنوياً',
  'featured',
  'active',
  true
FROM farms f
WHERE f.status = 'active'
LIMIT 3
ON CONFLICT DO NOTHING;
