/*
  # ربط طلبات الاستثمار بمواسم التشغيل

  ## الهدف
  إنشاء جسر بين طلبات الاستثمار ومواسم التشغيل.

  ## التغييرات

  1. إضافة حقل season_id إلى جدول b2f_investment_requests
  2. إنشاء دالة لإنشاء أو ربط موسم تلقائياً عند اعتماد الإيصال
  3. إنشاء trigger لتفعيل الربط التلقائي
  4. إنشاء دالة لحساب عدد المستثمرين في كل موسم

  ## منطق العمل

  عند اعتماد إيصال رسوم التشغيل:
  1. البحث عن موسم نشط لهذه المزرعة في نفس السنة
  2. إذا وُجد موسم → ربط الطلب به
  3. إذا لم يوجد → إنشاء موسم جديد وربط الطلب به
*/

-- إضافة حقل season_id إلى جدول b2f_investment_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_investment_requests'
    AND column_name = 'season_id'
  ) THEN
    ALTER TABLE b2f_investment_requests
    ADD COLUMN season_id uuid REFERENCES farm_seasons(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_b2f_investment_requests_season_id
    ON b2f_investment_requests(season_id);
  END IF;
END $$;

-- دالة للحصول على أو إنشاء موسم للمزرعة
CREATE OR REPLACE FUNCTION get_or_create_season_for_farm(
  p_farm_id uuid,
  p_year integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_season_id uuid;
  v_current_year integer;
  v_season_name text;
  v_farm_name text;
BEGIN
  -- تحديد السنة (السنة الحالية إذا لم تُحدد)
  v_current_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  
  -- البحث عن موسم نشط لهذه المزرعة في هذه السنة
  SELECT id INTO v_season_id
  FROM farm_seasons
  WHERE farm_id = p_farm_id
    AND season_year = v_current_year
    AND status IN ('season_created', 'active', 'harvest')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- إذا وُجد موسم، إرجاع معرفه
  IF v_season_id IS NOT NULL THEN
    RETURN v_season_id;
  END IF;
  
  -- إذا لم يوجد موسم، إنشاء موسم جديد
  -- جلب اسم المزرعة
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;
  
  v_season_name := 'موسم ' || v_current_year::text;
  
  -- إنشاء الموسم الجديد
  INSERT INTO farm_seasons (
    farm_id,
    season_name,
    season_year,
    season_type,
    status,
    start_date
  ) VALUES (
    p_farm_id,
    v_season_name,
    v_current_year,
    'oil', -- نوع افتراضي، يمكن تغييره لاحقاً
    'season_created',
    CURRENT_DATE
  )
  RETURNING id INTO v_season_id;
  
  RETURN v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لربط طلب الاستثمار بموسم تلقائياً
CREATE OR REPLACE FUNCTION auto_link_request_to_season()
RETURNS TRIGGER AS $$
DECLARE
  v_season_id uuid;
BEGIN
  -- التحقق من أن الطلب تم نقله للتشغيل ولديه farm_id
  IF NEW.transferred_to_operations = true
     AND NEW.farm_id IS NOT NULL
     AND NEW.season_id IS NULL THEN
    
    -- الحصول على أو إنشاء موسم للمزرعة
    v_season_id := get_or_create_season_for_farm(NEW.farm_id);
    
    -- ربط الطلب بالموسم
    NEW.season_id := v_season_id;
    
    -- تحديث حالة الموسم إلى نشط إذا كان في حالة "تم إنشاؤه"
    UPDATE farm_seasons
    SET status = 'active'
    WHERE id = v_season_id
      AND status = 'season_created';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لربط الطلب بالموسم تلقائياً
DROP TRIGGER IF EXISTS auto_link_request_to_season_trigger ON b2f_investment_requests;
CREATE TRIGGER auto_link_request_to_season_trigger
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  WHEN (
    NEW.transferred_to_operations = true
    AND OLD.transferred_to_operations = false
  )
  EXECUTE FUNCTION auto_link_request_to_season();

-- دالة لحساب عدد المستثمرين في موسم
CREATE OR REPLACE FUNCTION count_investors_in_season(p_season_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT investor_phone)::integer
    FROM b2f_investment_requests
    WHERE season_id = p_season_id
      AND transferred_to_operations = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب عدد الأشجار في موسم
CREATE OR REPLACE FUNCTION count_trees_in_season(p_season_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(trees_count), 0)::integer
    FROM b2f_investment_requests
    WHERE season_id = p_season_id
      AND transferred_to_operations = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليقات للتوضيح
COMMENT ON COLUMN b2f_investment_requests.season_id IS 'معرف موسم التشغيل المرتبط بهذا الطلب';
COMMENT ON FUNCTION get_or_create_season_for_farm(uuid, integer) IS 'الحصول على موسم نشط أو إنشاء موسم جديد للمزرعة';
COMMENT ON FUNCTION auto_link_request_to_season() IS 'ربط طلب الاستثمار بموسم تلقائياً عند نقله للتشغيل';
COMMENT ON FUNCTION count_investors_in_season(uuid) IS 'حساب عدد المستثمرين الفريدين في موسم';
COMMENT ON FUNCTION count_trees_in_season(uuid) IS 'حساب إجمالي عدد الأشجار في موسم';
