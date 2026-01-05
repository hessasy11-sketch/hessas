/*
  # تصحيح trigger - إزالة fc_farm_governance_log

  1. التغييرات
    - إزالة التسجيل في fc_farm_governance_log (غير موجود)
    - الاحتفاظ بالوظيفة الأساسية فقط
*/

CREATE OR REPLACE FUNCTION auto_create_operational_farm_on_contract()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  farm_exists BOOLEAN;
  operational_farm_id UUID;
  farm_name TEXT;
BEGIN
  -- فقط للعقود النشطة الجديدة
  IF NEW.status = 'active' AND NEW.farm_id IS NOT NULL THEN
    
    -- التحقق من وجود المزرعة وجلب اسمها
    SELECT EXISTS(
      SELECT 1 FROM b2f_farms WHERE id = NEW.farm_id
    ), (SELECT name FROM b2f_farms WHERE id = NEW.farm_id)
    INTO farm_exists, farm_name;

    IF NOT farm_exists THEN
      RAISE EXCEPTION 'Farm not found: %', NEW.farm_id;
    END IF;

    -- التحقق من عدم وجود operational farm مسبقاً
    SELECT id INTO operational_farm_id
    FROM fc_operational_farms
    WHERE reference_farm_id = NEW.farm_id
    LIMIT 1;

    -- إنشاء المزرعة التشغيلية إذا لم تكن موجودة
    IF operational_farm_id IS NULL THEN
      INSERT INTO fc_operational_farms (
        reference_farm_id,
        operational_name,
        operational_status,
        created_at
      ) VALUES (
        NEW.farm_id,
        farm_name || ' - تشغيلية',
        'setup',
        now()
      )
      RETURNING id INTO operational_farm_id;

      -- تحديث حالة المزرعة الأساسية
      UPDATE b2f_farms
      SET operational_status = 'setup',
          updated_at = now()
      WHERE id = NEW.farm_id;

      RAISE NOTICE 'Operational farm created for farm_id: %, operational_farm_id: %', NEW.farm_id, operational_farm_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;