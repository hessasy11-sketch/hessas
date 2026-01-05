/*
  # ولادة المزرعة التلقائية بعد توثيق العقد

  1. التغييرات
    - إضافة trigger لإنشاء fc_operational_farms تلقائياً عند إصدار العقد
    - ربط العقد بالمزرعة التشغيلية
    - تحديث operational_status إلى active
    - تسجيل في سجل الأحداث

  2. الشروط
    - العقد يجب أن يكون نشط (status = 'active')
    - المزرعة يجب أن تكون موجودة
    - عدم وجود operational farm مسبقاً

  3. الأمان
    - SECURITY DEFINER
    - تحقق من البيانات
*/

-- دالة: إنشاء المزرعة التشغيلية تلقائياً عند إصدار العقد
CREATE OR REPLACE FUNCTION auto_create_operational_farm_on_contract()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  farm_exists BOOLEAN;
  operational_farm_id UUID;
BEGIN
  -- فقط للعقود النشطة الجديدة
  IF NEW.status = 'active' AND NEW.farm_id IS NOT NULL THEN
    
    -- التحقق من وجود المزرعة
    SELECT EXISTS(
      SELECT 1 FROM b2f_farms WHERE id = NEW.farm_id
    ) INTO farm_exists;

    IF NOT farm_exists THEN
      RAISE EXCEPTION 'Farm not found: %', NEW.farm_id;
    END IF;

    -- التحقق من عدم وجود operational farm مسبقاً
    SELECT id INTO operational_farm_id
    FROM fc_operational_farms
    WHERE farm_id = NEW.farm_id
    LIMIT 1;

    -- إنشاء المزرعة التشغيلية إذا لم تكن موجودة
    IF operational_farm_id IS NULL THEN
      INSERT INTO fc_operational_farms (
        farm_id,
        operational_status,
        created_at
      ) VALUES (
        NEW.farm_id,
        'setup',
        now()
      )
      RETURNING id INTO operational_farm_id;

      -- تحديث حالة المزرعة الأساسية
      UPDATE b2f_farms
      SET operational_status = 'setup',
          updated_at = now()
      WHERE id = NEW.farm_id;

      -- تسجيل في سجل الأحداث
      INSERT INTO fc_farm_governance_log (
        farm_id,
        action_type,
        action_description,
        performed_by_role,
        metadata
      ) VALUES (
        NEW.farm_id,
        'farm_birth',
        'تم إنشاء المزرعة التشغيلية تلقائياً بعد توثيق العقد رقم: ' || NEW.contract_number,
        'system',
        jsonb_build_object(
          'contract_id', NEW.id,
          'contract_number', NEW.contract_number,
          'operational_farm_id', operational_farm_id,
          'investor_phone', NEW.investor_phone
        )
      );

      RAISE NOTICE 'Operational farm created for farm_id: %, operational_farm_id: %', NEW.farm_id, operational_farm_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: إنشاء المزرعة التشغيلية عند إصدار العقد
DROP TRIGGER IF EXISTS trigger_auto_create_operational_farm ON b2f_contracts;
CREATE TRIGGER trigger_auto_create_operational_farm
  AFTER INSERT ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_operational_farm_on_contract();

-- دالة مساعدة: الحصول على operational farm للمزرعة
CREATE OR REPLACE FUNCTION get_operational_farm_for_farm(p_farm_id UUID)
RETURNS TABLE (
  operational_farm_id UUID,
  operational_status TEXT,
  farm_manager_id UUID,
  farm_manager_name TEXT,
  readiness_score INTEGER,
  teams_count INTEGER,
  members_count INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    of.id as operational_farm_id,
    of.operational_status::TEXT,
    of.farm_manager_id,
    ps.name_ar as farm_manager_name,
    calculate_farm_readiness(p_farm_id) as readiness_score,
    (SELECT COUNT(*)::INTEGER FROM fc_farm_teams WHERE operational_farm_id = of.id) as teams_count,
    (SELECT COUNT(*)::INTEGER FROM fc_farm_team_members ftm
     JOIN fc_farm_teams ft ON ftm.team_id = ft.id
     WHERE ft.operational_farm_id = of.id) as members_count
  FROM fc_operational_farms of
  LEFT JOIN platform_staff ps ON of.farm_manager_id = ps.id
  WHERE of.farm_id = p_farm_id
  LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_operational_farm_on_contract() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_operational_farm_for_farm(UUID) TO authenticated, service_role, anon;