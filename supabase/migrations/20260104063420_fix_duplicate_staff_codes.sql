/*
  # إصلاح مشكلة تكرار أكواد الموظفين

  1. التعديلات
    - إزالة أي أكواد مكررة موجودة
    - إعادة توليد أكواد فريدة للموظفين المكررين
    - إضافة trigger لتوليد أكواد فريدة تلقائياً

  2. الأمان
    - الحفاظ على بيانات الموظفين
    - عدم حذف أي سجلات
*/

-- إصلاح الأكواد المكررة إن وجدت
DO $$
DECLARE
  v_staff_record RECORD;
  v_counter INTEGER := 1;
  v_timestamp TEXT;
BEGIN
  FOR v_staff_record IN
    SELECT id, staff_code, created_at
    FROM platform_staff
    WHERE staff_code IN (
      SELECT staff_code
      FROM platform_staff
      WHERE staff_code IS NOT NULL
      GROUP BY staff_code
      HAVING COUNT(*) > 1
    )
    ORDER BY created_at
  LOOP
    v_timestamp := LPAD(EXTRACT(EPOCH FROM v_staff_record.created_at)::bigint::text, 10, '0');
    v_timestamp := RIGHT(v_timestamp, 6);

    UPDATE platform_staff
    SET staff_code = CONCAT(staff_code, '-', v_timestamp)
    WHERE id = v_staff_record.id
      AND staff_code = v_staff_record.staff_code;

    v_counter := v_counter + 1;
  END LOOP;

  RAISE NOTICE 'تم إصلاح % سجل', v_counter - 1;
END $$;

-- دالة لتوليد staff_code فريد
CREATE OR REPLACE FUNCTION generate_unique_staff_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_number INTEGER;
  v_timestamp TEXT;
  v_new_code TEXT;
  v_attempts INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  LOOP
    SELECT COALESCE(
      MAX(
        CASE
          WHEN staff_code ~ '^A-\d+'
          THEN CAST(SUBSTRING(staff_code FROM 'A-(\d+)') AS INTEGER)
          ELSE 0
        END
      ), 0
    ) INTO v_max_number
    FROM platform_staff
    WHERE staff_code IS NOT NULL;

    v_max_number := v_max_number + 1;

    v_timestamp := LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 10, '0');
    v_timestamp := RIGHT(v_timestamp, 4);

    IF v_attempts > 0 THEN
      v_timestamp := v_timestamp || LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
    END IF;

    v_new_code := CONCAT('A-', LPAD(v_max_number::text, 5, '0'), '-', v_timestamp);

    SELECT EXISTS(
      SELECT 1 FROM platform_staff WHERE staff_code = v_new_code
    ) INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_new_code;
    END IF;

    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'فشل توليد staff_code فريد بعد 10 محاولات';
    END IF;

    PERFORM pg_sleep(0.001);
  END LOOP;
END;
$$;

-- trigger لتوليد staff_code تلقائياً
CREATE OR REPLACE FUNCTION auto_generate_staff_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.staff_code IS NULL OR NEW.staff_code = '' THEN
    NEW.staff_code := generate_unique_staff_code();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_staff_code ON platform_staff;
CREATE TRIGGER trigger_auto_generate_staff_code
  BEFORE INSERT ON platform_staff
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_staff_code();

-- index للأداء
CREATE INDEX IF NOT EXISTS idx_platform_staff_staff_code_pattern
ON platform_staff(staff_code)
WHERE staff_code ~ '^A-\d+';

ANALYZE platform_staff;
