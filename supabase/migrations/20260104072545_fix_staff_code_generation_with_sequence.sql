/*
  # إصلاح توليد رقم الموظف بشكل نهائي

  1. إنشاء Sequence لضمان عدم التكرار
  2. إنشاء دالة database-side لتوليد staff_code فريد
  3. ضمان عدم حدوث race conditions

  ## الميزات:
  - رقم تسلسلي فريد من database
  - UUID جزئي للتأكد من الفرادة
  - لا يمكن حدوث تكرار أبداً
*/

-- إنشاء sequence لأرقام الموظفين
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'platform_staff_code_seq') THEN
    CREATE SEQUENCE platform_staff_code_seq START WITH 1 INCREMENT BY 1;
  END IF;
END $$;

-- دالة لتوليد staff_code فريد 100%
CREATE OR REPLACE FUNCTION generate_unique_staff_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence_num BIGINT;
  v_uuid_part TEXT;
  v_staff_code TEXT;
  v_attempt INT := 0;
  v_max_attempts INT := 10;
BEGIN
  LOOP
    -- الحصول على رقم تسلسلي فريد من sequence
    v_sequence_num := nextval('platform_staff_code_seq');
    
    -- استخدام جزء من UUID للتأكد من الفرادة التامة
    v_uuid_part := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8);
    
    -- تكوين الكود النهائي
    v_staff_code := 'A-' || LPAD(v_sequence_num::TEXT, 5, '0') || '-' || UPPER(v_uuid_part);
    
    -- التحقق من عدم وجوده (احتياط إضافي)
    IF NOT EXISTS (SELECT 1 FROM platform_staff WHERE staff_code = v_staff_code) THEN
      RETURN v_staff_code;
    END IF;
    
    v_attempt := v_attempt + 1;
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique staff code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION generate_unique_staff_code() TO authenticated, anon, service_role;

-- إنشاء RPC endpoint لاستخدامه من Frontend
CREATE OR REPLACE FUNCTION get_new_staff_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN generate_unique_staff_code();
END;
$$;

GRANT EXECUTE ON FUNCTION get_new_staff_code() TO authenticated, anon, service_role;
