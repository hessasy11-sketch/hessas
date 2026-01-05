/*
  # إضافة التوليد التلقائي للتنبيهات الذكية

  1. التغييرات
    - إضافة triggers لتوليد تنبيهات تلقائية عند:
      - تغيير حالة المزرعة إلى suspended
      - وصول readiness score إلى 80% أو أعلى
    - إضافة دالة cleanup لتنظيف التنبيهات القديمة

  2. الأمان
    - جميع الدوال بـ SECURITY DEFINER
    - Triggers تعمل تلقائياً
*/

-- دالة: إنشاء تنبيه عند توقيف المزرعة
CREATE OR REPLACE FUNCTION auto_create_farm_suspended_alert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- فقط عند تغيير الحالة إلى suspended
  IF NEW.operational_status = 'suspended' AND
     (OLD.operational_status IS NULL OR OLD.operational_status != 'suspended') THEN

    INSERT INTO fc_farm_alerts (
      alert_type,
      farm_id,
      severity,
      message,
      data,
      is_resolved
    ) VALUES (
      'farms_suspended',
      NEW.id,
      'warning',
      'تم توقيف المزرعة: ' || NEW.name,
      jsonb_build_object(
        'farm_name', NEW.name,
        'suspended_reason', NEW.suspended_reason,
        'suspended_at', NEW.suspended_at
      ),
      false
    );
  END IF;

  -- حل التنبيه عند إعادة تفعيل المزرعة
  IF NEW.operational_status = 'active' AND OLD.operational_status = 'suspended' THEN
    UPDATE fc_farm_alerts
    SET is_resolved = true,
        resolved_at = now()
    WHERE farm_id = NEW.id
      AND alert_type = 'farms_suspended'
      AND is_resolved = false;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: مراقبة تغيير حالة المزرعة
DROP TRIGGER IF EXISTS trigger_farm_suspended_alert ON b2f_farms;
CREATE TRIGGER trigger_farm_suspended_alert
  AFTER UPDATE OF operational_status ON b2f_farms
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_farm_suspended_alert();

-- دالة: إنشاء تنبيه عند جاهزية المزرعة
CREATE OR REPLACE FUNCTION check_and_alert_farm_readiness()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  farm_record RECORD;
  readiness_score INTEGER;
BEGIN
  -- البحث عن جميع المزارع النشطة
  FOR farm_record IN
    SELECT id, name
    FROM b2f_farms
    WHERE is_active = true
  LOOP
    -- حساب الجاهزية
    SELECT calculate_farm_readiness(farm_record.id) INTO readiness_score;

    -- إذا كانت الجاهزية 80% أو أعلى ولا يوجد تنبيه مفتوح
    IF readiness_score >= 80 THEN
      -- التحقق من عدم وجود تنبيه مفتوح لهذه المزرعة
      IF NOT EXISTS (
        SELECT 1 FROM fc_farm_alerts
        WHERE farm_id = farm_record.id
          AND alert_type = 'farms_ready_review'
          AND is_resolved = false
      ) THEN
        INSERT INTO fc_farm_alerts (
          alert_type,
          farm_id,
          severity,
          message,
          data,
          is_resolved
        ) VALUES (
          'farms_ready_review',
          farm_record.id,
          'info',
          'المزرعة جاهزة للمراجعة: ' || farm_record.name,
          jsonb_build_object(
            'farm_name', farm_record.name,
            'readiness_score', readiness_score
          ),
          false
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- دالة: تنظيف التنبيهات المحلولة القديمة (أكثر من 30 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_resolved_alerts()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM fc_farm_alerts
  WHERE is_resolved = true
    AND resolved_at < (now() - interval '30 days');
END;
$$;

-- دالة: إنشاء تنبيهات للمزارع بدون مدير
CREATE OR REPLACE FUNCTION check_farms_without_manager()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  farm_record RECORD;
BEGIN
  FOR farm_record IN
    SELECT f.id, f.name
    FROM b2f_farms f
    LEFT JOIN fc_operational_farms of ON f.id = of.farm_id
    WHERE f.is_active = true
      AND f.operational_status = 'active'
      AND (of.farm_manager_id IS NULL)
  LOOP
    -- التحقق من عدم وجود تنبيه مفتوح
    IF NOT EXISTS (
      SELECT 1 FROM fc_farm_alerts
      WHERE farm_id = farm_record.id
        AND alert_type = 'no_manager'
        AND is_resolved = false
    ) THEN
      INSERT INTO fc_farm_alerts (
        alert_type,
        farm_id,
        severity,
        message,
        data,
        is_resolved
      ) VALUES (
        'no_manager',
        farm_record.id,
        'warning',
        'المزرعة بدون مدير: ' || farm_record.name,
        jsonb_build_object('farm_name', farm_record.name),
        false
      );
    END IF;
  END LOOP;
END;
$$;

-- دالة مركزية: تشغيل جميع فحوصات التنبيهات
CREATE OR REPLACE FUNCTION run_all_smart_alerts_checks()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- فحص جاهزية المزارع
  PERFORM check_and_alert_farm_readiness();

  -- فحص المزارع بدون مدير
  PERFORM check_farms_without_manager();

  -- تنظيف التنبيهات القديمة
  PERFORM cleanup_old_resolved_alerts();

  RAISE NOTICE 'Smart alerts check completed successfully';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_farm_suspended_alert() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_and_alert_farm_readiness() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_resolved_alerts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_farms_without_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION run_all_smart_alerts_checks() TO authenticated, service_role;