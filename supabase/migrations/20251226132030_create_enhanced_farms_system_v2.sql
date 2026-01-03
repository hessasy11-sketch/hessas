/*
  # إنشاء نظام إدارة المزارع المتقدم

  ## نظرة عامة
  إنشاء جدول شامل للمزارع مع جميع الحقول والمؤشرات المطلوبة
  
  ## الجداول
  - farms: جدول المزارع الرئيسي
  
  ## المميزات
  - معلومات أساسية كاملة
  - مؤشرات ذكية للأداء
  - دوال حسابية للإحصائيات
  - حماية من الحذف الخاطئ
  - صور متعددة
  - حالات مختلفة
*/

-- إنشاء جدول المزارع
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات أساسية
  name text NOT NULL,
  location text NOT NULL,
  city text,
  
  -- نوع الأشجار
  tree_type text DEFAULT 'نخيل' CHECK (tree_type IN ('نخيل', 'زيتون', 'أخرى')),
  custom_tree_type text,
  
  -- الطاقة والمساحة
  total_trees_available integer DEFAULT 0,
  area_size numeric(10,2) DEFAULT 0,
  area_unit text DEFAULT 'م²',
  
  -- الوصف
  internal_description text,
  marketing_description text,
  
  -- الصور
  images jsonb DEFAULT '[]'::jsonb,
  
  -- الحالة
  status text DEFAULT 'active' CHECK (status IN ('active', 'under_preparation', 'inactive')),
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_farms_status ON farms(status);
CREATE INDEX IF NOT EXISTS idx_farms_tree_type ON farms(tree_type);
CREATE INDEX IF NOT EXISTS idx_farms_location ON farms(location);
CREATE INDEX IF NOT EXISTS idx_farms_created_at ON farms(created_at DESC);

-- دالة تحديث التاريخ
CREATE OR REPLACE FUNCTION update_farms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث التاريخ
DROP TRIGGER IF EXISTS update_farms_updated_at_trigger ON farms;
CREATE TRIGGER update_farms_updated_at_trigger
  BEFORE UPDATE ON farms
  FOR EACH ROW
  EXECUTE FUNCTION update_farms_updated_at();

-- ===============================================
-- دوال المؤشرات الذكية
-- ===============================================

-- دالة حساب عدد العروض النشطة
CREATE OR REPLACE FUNCTION get_farm_active_opportunities_count(farm_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO count_result
  FROM investment_opportunities
  WHERE farm_id = farm_id_param
    AND status = 'active';
  
  RETURN COALESCE(count_result, 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- دالة حساب مجموع الأشجار في العروض
CREATE OR REPLACE FUNCTION get_farm_total_trees_in_opportunities(farm_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_result integer;
BEGIN
  SELECT COALESCE(SUM(available_trees), 0)::integer
  INTO total_result
  FROM investment_opportunities
  WHERE farm_id = farm_id_param
    AND status = 'active';
  
  RETURN COALESCE(total_result, 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- دالة حساب نسبة الاستخدام
CREATE OR REPLACE FUNCTION get_farm_usage_percentage(farm_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_available integer;
  total_in_offers integer;
  percentage numeric;
BEGIN
  SELECT total_trees_available
  INTO total_available
  FROM farms
  WHERE id = farm_id_param;
  
  IF total_available IS NULL OR total_available = 0 THEN
    RETURN 0;
  END IF;
  
  total_in_offers := get_farm_total_trees_in_opportunities(farm_id_param);
  percentage := (total_in_offers::numeric / total_available::numeric) * 100;
  
  RETURN ROUND(percentage, 1);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- دالة الإحصائيات الشاملة
CREATE OR REPLACE FUNCTION get_farm_statistics(farm_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  active_count integer;
  trees_in_offers integer;
  usage_pct numeric;
BEGIN
  active_count := get_farm_active_opportunities_count(farm_id_param);
  trees_in_offers := get_farm_total_trees_in_opportunities(farm_id_param);
  usage_pct := get_farm_usage_percentage(farm_id_param);
  
  result := json_build_object(
    'active_opportunities_count', active_count,
    'total_trees_in_opportunities', trees_in_offers,
    'usage_percentage', usage_pct
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'active_opportunities_count', 0,
      'total_trees_in_opportunities', 0,
      'usage_percentage', 0
    );
END;
$$;

-- دالة التحقق من إمكانية الحذف
CREATE OR REPLACE FUNCTION can_delete_farm(farm_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  opportunities_count integer;
  requests_count integer;
BEGIN
  SELECT COUNT(*)
  INTO opportunities_count
  FROM investment_opportunities
  WHERE farm_id = farm_id_param;
  
  SELECT COUNT(*)
  INTO requests_count
  FROM investor_intent_requests
  WHERE opportunity_id IN (
    SELECT id FROM investment_opportunities WHERE farm_id = farm_id_param
  );
  
  RETURN (opportunities_count = 0 AND requests_count = 0);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ===============================================
-- سياسات RLS
-- ===============================================

-- الأدمن: قراءة الكل
CREATE POLICY "Admins can read all farms"
  ON farms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

-- الأدمن: إضافة
CREATE POLICY "Admins can insert farms"
  ON farms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

-- الأدمن: تعديل
CREATE POLICY "Admins can update farms"
  ON farms FOR UPDATE
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

-- الأدمن: حذف
CREATE POLICY "Admins can delete farms"
  ON farms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

-- المستخدمون: قراءة النشطة فقط
CREATE POLICY "Users can read active farms"
  ON farms FOR SELECT
  TO public
  USING (status = 'active');

-- ===============================================
-- بيانات تجريبية
-- ===============================================

INSERT INTO farms (
  name,
  location,
  city,
  tree_type,
  total_trees_available,
  area_size,
  area_unit,
  internal_description,
  marketing_description,
  status
) VALUES
  (
    'مزرعة القصيم - نخيل سكري',
    'القصيم',
    'بريدة',
    'نخيل',
    300,
    50000,
    'م²',
    'مزرعة منتجة بنظام ري حديث، التربة خصبة، الإنتاجية عالية',
    'موقع استثماري خاص بمنطقة القصيم تحت إشراف فريق المنصة، نخيل سكري عالي الجودة',
    'active'
  ),
  (
    'مزرعة الجوف - زيتون',
    'الجوف',
    'سكاكا',
    'زيتون',
    500,
    80000,
    'م²',
    'مزرعة زيتون حديثة، معتمدة عضوياً، إدارة محترفة',
    'فرصة استثمارية مميزة في الجوف، أشجار زيتون منتقاة بعناية',
    'active'
  ),
  (
    'مزرعة الأحساء - نخيل برحي',
    'الشرقية',
    'الأحساء',
    'نخيل',
    200,
    35000,
    'م²',
    'نخيل برحي مشهور، إنتاجية ممتازة، موقع تراثي',
    'استثمر في تراث الأحساء، نخيل برحي أصيل',
    'active'
  ),
  (
    'مزرعة تبوك - مانجو',
    'تبوك',
    'تبوك',
    'أخرى',
    150,
    25000,
    'م²',
    'مزرعة مانجو تجريبية، نتائج واعدة جداً',
    'فرصة استثمارية فريدة في تبوك، أشجار مانجو عالية الجودة',
    'under_preparation'
  ),
  (
    'مزرعة المدينة - عنب',
    'المدينة المنورة',
    'المدينة',
    'أخرى',
    100,
    15000,
    'م²',
    'مزرعة عنب صغيرة، تحت التطوير',
    'استثمر في مزرعة عنب بالمدينة المنورة',
    'inactive'
  )
ON CONFLICT DO NOTHING;

-- تحديث نوع الأشجار المخصص
UPDATE farms 
SET custom_tree_type = 'مانجو'
WHERE name = 'مزرعة تبوك - مانجو' AND tree_type = 'أخرى';

UPDATE farms 
SET custom_tree_type = 'عنب'
WHERE name = 'مزرعة المدينة - عنب' AND tree_type = 'أخرى';
