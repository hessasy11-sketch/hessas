/*
  # إنشاء جدول العروض الاستثمارية B2F

  1. الجدول الرئيسي
    - `b2f_opportunities` - جدول العروض الاستثمارية
  
  2. الحقول الأساسية
    - farm_id مرتبط بجدول b2f_farms
    - معلومات الفرصة الاستثمارية
    - الأسعار والتفاصيل
    - الحالة والنشاط

  3. الأمان
    - RLS مفعل
    - العرض العام متاح للجميع
    - التعديل والإدارة للإداريين فقط
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
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

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_farm_id ON b2f_opportunities(farm_id);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_status ON b2f_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_is_active ON b2f_opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_created_at ON b2f_opportunities(created_at DESC);

-- تفعيل RLS
ALTER TABLE b2f_opportunities ENABLE ROW LEVEL SECURITY;

-- سياسات RLS: العرض العام
CREATE POLICY "Anyone can view active opportunities"
  ON b2f_opportunities
  FOR SELECT
  TO public
  USING (is_active = true AND status = 'active');

-- سياسات RLS: الإداريون يمكنهم رؤية كل شيء
CREATE POLICY "Platform owners can view all opportunities"
  ON b2f_opportunities
  FOR SELECT
  TO public
  USING (is_platform_owner());

-- سياسات RLS: الإدخال
CREATE POLICY "Platform owners can insert opportunities"
  ON b2f_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_owner());

-- سياسات RLS: التعديل
CREATE POLICY "Platform owners can update opportunities"
  ON b2f_opportunities
  FOR UPDATE
  TO authenticated
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

-- سياسات RLS: الحذف
CREATE POLICY "Platform owners can delete opportunities"
  ON b2f_opportunities
  FOR DELETE
  TO authenticated
  USING (is_platform_owner());

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_b2f_opportunities_updated_at_trigger
  BEFORE UPDATE ON b2f_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_opportunities_updated_at();

-- إضافة بيانات تجريبية
INSERT INTO b2f_opportunities (
  farm_id,
  title,
  description,
  tree_type,
  investment_type,
  price_per_tree,
  min_trees,
  available_trees,
  contract_duration_years,
  expected_return,
  badge,
  status,
  is_active
)
SELECT 
  f.id,
  'فرصة استثمارية في ' || f.name,
  'استثمر في مزرعة ' || f.name || ' واحصل على عوائد مستقرة وموثوقة',
  'نخيل',
  'rental',
  189.00,
  3,
  100,
  10,
  '15-20% سنوياً',
  'featured',
  'active',
  true
FROM b2f_farms f
WHERE NOT EXISTS (
  SELECT 1 FROM b2f_opportunities WHERE farm_id = f.id
)
LIMIT 1;

COMMENT ON TABLE b2f_opportunities IS 'Investment opportunities for B2F farms';
