/*
  # تحديث مرجع المزارع في جدول العروض

  ## التغييرات
  - حذف Foreign Key القديم المرتبط بـ b2f_farms
  - إنشاء Foreign Key جديد مرتبط بـ farms
  - إضافة الحقول الجديدة للمرحلة الرابعة
  - إضافة الدوال المطلوبة
*/

-- حذف الـ Foreign Key القديم
ALTER TABLE b2f_opportunities 
DROP CONSTRAINT IF EXISTS b2f_opportunities_farm_id_fkey;

-- إنشاء Foreign Key جديد يشير إلى جدول farms
ALTER TABLE b2f_opportunities 
ADD CONSTRAINT b2f_opportunities_farm_id_fkey 
FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE;

-- إضافة الحقول الجديدة
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_opportunities' AND column_name = 'custom_tree_type'
  ) THEN
    ALTER TABLE b2f_opportunities ADD COLUMN custom_tree_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_opportunities' AND column_name = 'available_trees'
  ) THEN
    ALTER TABLE b2f_opportunities ADD COLUMN available_trees integer DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_opportunities' AND column_name = 'badge'
  ) THEN
    ALTER TABLE b2f_opportunities ADD COLUMN badge text DEFAULT 'none';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_opportunities' AND column_name = 'internal_tag'
  ) THEN
    ALTER TABLE b2f_opportunities ADD COLUMN internal_tag text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_opportunities' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE b2f_opportunities ADD COLUMN video_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_opportunities' AND column_name = 'location_url'
  ) THEN
    ALTER TABLE b2f_opportunities ADD COLUMN location_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_opportunities' AND column_name = 'status'
  ) THEN
    ALTER TABLE b2f_opportunities ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_tree_type ON b2f_opportunities(tree_type);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_status ON b2f_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_badge ON b2f_opportunities(badge);
CREATE INDEX IF NOT EXISTS idx_b2f_opportunities_farm_id ON b2f_opportunities(farm_id);

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

-- ===============================================
-- تحديث سياسات RLS
-- ===============================================

DROP POLICY IF EXISTS "Anyone can view active opportunities" ON b2f_opportunities;
DROP POLICY IF EXISTS "Public can view active opportunities" ON b2f_opportunities;
DROP POLICY IF EXISTS "Public can view active b2f opportunities" ON b2f_opportunities;

CREATE POLICY "Public can view active b2f opportunities"
  ON b2f_opportunities FOR SELECT
  TO public
  USING (status = 'active' AND is_active = true);

DROP POLICY IF EXISTS "Admins can view all b2f opportunities" ON b2f_opportunities;
CREATE POLICY "Admins can view all b2f opportunities"
  ON b2f_opportunities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert b2f opportunities" ON b2f_opportunities;
CREATE POLICY "Admins can insert b2f opportunities"
  ON b2f_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update b2f opportunities" ON b2f_opportunities;
CREATE POLICY "Admins can update b2f opportunities"
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

DROP POLICY IF EXISTS "Admins can delete b2f opportunities" ON b2f_opportunities;
CREATE POLICY "Admins can delete b2f opportunities"
  ON b2f_opportunities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'platform_admin'
    )
  );

-- ===============================================
-- Trigger لتحديث الحالة تلقائياً
-- ===============================================

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
-- تحديث البيانات الموجودة
-- ===============================================

UPDATE b2f_opportunities
SET 
  available_trees = COALESCE(available_trees, 100),
  badge = COALESCE(badge, 'none'),
  status = CASE 
    WHEN is_active = true THEN 'active'
    ELSE 'hidden'
  END
WHERE status IS NULL;

-- إضافة عروض تجريبية
INSERT INTO b2f_opportunities (
  farm_id,
  title,
  description,
  tree_type,
  custom_tree_type,
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
  f.custom_tree_type,
  'rental',
  CASE 
    WHEN f.total_trees_available >= 100 THEN 100
    WHEN f.total_trees_available >= 50 THEN 50
    ELSE GREATEST(f.total_trees_available, 10)
  END,
  189.00,
  3,
  NULL,
  10,
  'عائد متوقع: 15-20% سنوياً',
  'none',
  CASE 
    WHEN f.status = 'active' THEN 'active'
    ELSE 'hidden'
  END,
  CASE 
    WHEN f.status = 'active' THEN true
    ELSE false
  END
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM b2f_opportunities o 
  WHERE o.farm_id = f.id
)
LIMIT 5
ON CONFLICT DO NOTHING;
