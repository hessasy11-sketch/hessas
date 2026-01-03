/*
  # الربط التلقائي: الإيصال → الموسم
  
  ## الوظيفة
  
  عند اعتماد إيصال الدفع تلقائياً:
  1. إنشاء موسم جديد للمزرعة
  2. إنشاء المراحل العشر
  3. تفعيل المرحلة الأولى
  4. تحديث حالة الطلب
  
  ## التدفق
  
  ```
  إيصال معتمد → Trigger → إنشاء موسم → 10 مراحل → تفعيل
  ```
  
  ⚠️ هذا هو المسار الوحيد للتشغيل
*/

-- 1. دالة إنشاء الموسم تلقائياً
CREATE OR REPLACE FUNCTION auto_create_season_on_payment_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_farm_id uuid;
  v_opportunity_id uuid;
  v_new_season_id uuid;
  v_current_year int;
  v_season_number int;
BEGIN
  -- فقط عند تغيير حالة الدفع إلى "approved"
  IF NEW.payment_status = 'approved' AND OLD.payment_status != 'approved' THEN
    
    -- الحصول على معلومات الفرصة
    SELECT 
      o.farm_id,
      o.id
    INTO 
      v_farm_id,
      v_opportunity_id
    FROM b2f_opportunities o
    WHERE o.id = NEW.opportunity_id;
    
    -- التحقق من وجود المزرعة
    IF v_farm_id IS NULL THEN
      RAISE EXCEPTION 'Farm not found for opportunity %', NEW.opportunity_id;
    END IF;
    
    -- حساب رقم الموسم
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(season_number), 0) + 1
    INTO v_season_number
    FROM b2f_farm_seasons
    WHERE farm_id = v_farm_id 
    AND season_year = v_current_year;
    
    -- إنشاء الموسم الجديد
    INSERT INTO b2f_farm_seasons (
      farm_id,
      season_number,
      season_year,
      status,
      current_phase,
      start_date,
      investment_request_id
    ) VALUES (
      v_farm_id,
      v_season_number,
      v_current_year,
      'season_activated',
      'activation',
      CURRENT_DATE,
      NEW.id
    )
    RETURNING id INTO v_new_season_id;
    
    -- إنشاء المراحل العشر
    INSERT INTO b2f_season_phases (
      season_id,
      phase_number,
      phase_name,
      phase_name_ar,
      status,
      estimated_duration_days
    ) VALUES
      (v_new_season_id, 1, 'Activation', 'تفعيل التشغيل', 'in_progress', 7),
      (v_new_season_id, 2, 'Growth', 'مرحلة النمو', 'pending', 30),
      (v_new_season_id, 3, 'Irrigation', 'الري المبرمج', 'pending', 60),
      (v_new_season_id, 4, 'Care', 'العناية الزراعية', 'pending', 45),
      (v_new_season_id, 5, 'Production', 'الإنتاج', 'pending', 90),
      (v_new_season_id, 6, 'Pre-Harvest', 'ما قبل الحصاد', 'pending', 14),
      (v_new_season_id, 7, 'Harvest', 'جني الثمار', 'pending', 21),
      (v_new_season_id, 8, 'Accounting', 'حسم الكميات والمصاريف', 'pending', 3),
      (v_new_season_id, 9, 'Processing', 'العصر والتغليف', 'pending', 7),
      (v_new_season_id, 10, 'Delivery', 'تسليم المنتج وإغلاق الموسم', 'pending', 3);
    
    -- تحديث حالة الطلب
    NEW.operational_status := 'season_created';
    
    RAISE NOTICE 'Season % created automatically for farm %', v_new_season_id, v_farm_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. المحفز التلقائي
DROP TRIGGER IF EXISTS trigger_auto_create_season ON b2f_investment_requests;

CREATE TRIGGER trigger_auto_create_season
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_season_on_payment_approval();

-- 3. إضافة عمود ربط في b2f_farm_seasons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_farm_seasons' 
    AND column_name = 'investment_request_id'
  ) THEN
    ALTER TABLE b2f_farm_seasons 
    ADD COLUMN investment_request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_farm_seasons_request 
    ON b2f_farm_seasons(investment_request_id);
  END IF;
END $$;

-- ✅ النظام التلقائي جاهز
-- ✅ إيصال معتمد = موسم يُنشأ تلقائياً