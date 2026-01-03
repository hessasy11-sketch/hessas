/*
  # إصلاح الـ Trigger لإنشاء الموسم التلقائي
  
  ## المشكلة
  الـ trigger يستخدم payment_status لكن الجدول يستخدم status فقط
  
  ## الحل
  تعديل الـ trigger ليستخدم status بدلاً من payment_status
*/

-- حذف الـ trigger القديم
DROP TRIGGER IF EXISTS trigger_auto_create_season ON b2f_investment_requests;

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS auto_create_season_on_payment_approval();

-- إنشاء دالة جديدة تستخدم status
CREATE OR REPLACE FUNCTION auto_create_season_on_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_farm_id uuid;
  v_new_season_id uuid;
  v_current_year int;
  v_season_number int;
  v_season_name text;
BEGIN
  -- فقط عند تحويل الطلب للتشغيل وليس له موسم
  IF NEW.transferred_to_operations = true 
     AND (OLD.transferred_to_operations = false OR OLD.transferred_to_operations IS NULL)
     AND NEW.season_id IS NULL 
     AND NEW.farm_id IS NOT NULL THEN
    
    v_farm_id := NEW.farm_id;
    
    -- البحث عن موسم نشط لهذه المزرعة
    SELECT id INTO v_new_season_id
    FROM farm_seasons
    WHERE farm_id = v_farm_id
      AND status IN ('season_created', 'active', 'harvest')
      AND season_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- إذا لم يوجد موسم، إنشاء موسم جديد
    IF v_new_season_id IS NULL THEN
      v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
      
      -- حساب رقم الموسم
      SELECT COALESCE(MAX(season_number), 0) + 1
      INTO v_season_number
      FROM farm_seasons
      WHERE farm_id = v_farm_id 
        AND season_year = v_current_year;
      
      v_season_name := 'موسم ' || v_current_year::text || ' - ' || v_season_number::text;
      
      -- إنشاء الموسم الجديد
      INSERT INTO farm_seasons (
        farm_id,
        season_name,
        season_year,
        season_type,
        status,
        start_date
      ) VALUES (
        v_farm_id,
        v_season_name,
        v_current_year,
        'oil',
        'active',
        CURRENT_DATE
      )
      RETURNING id INTO v_new_season_id;
      
      RAISE NOTICE 'Created new season % for farm %', v_new_season_id, v_farm_id;
    END IF;
    
    -- ربط الطلب بالموسم
    NEW.season_id := v_new_season_id;
    
    RAISE NOTICE 'Linked request % to season %', NEW.id, v_new_season_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء الـ trigger الجديد
CREATE TRIGGER trigger_auto_create_season_on_transfer
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_season_on_status_change();
