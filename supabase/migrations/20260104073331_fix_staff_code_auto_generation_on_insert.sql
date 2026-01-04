/*
  # إصلاح نهائي: توليد staff_code تلقائياً في Database
  
  1. إنشاء trigger يولد staff_code تلقائياً عند الإدخال
  2. لا حاجة لتوليد الكود في Frontend
  3. يمنع race conditions بشكل كامل
  
  ## الآلية:
  - عند إدخال موظف جديد بدون staff_code، يُولد تلقائياً
  - ضمان الفرادة 100% من Database
  - لا مجال لأي تضارب أو تكرار
*/

-- دالة trigger لتوليد staff_code تلقائياً
CREATE OR REPLACE FUNCTION auto_generate_staff_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إذا لم يتم تقديم staff_code، قم بتوليده
  IF NEW.staff_code IS NULL THEN
    NEW.staff_code := generate_unique_staff_code();
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger على platform_staff
DROP TRIGGER IF EXISTS trigger_auto_generate_staff_code ON platform_staff;

CREATE TRIGGER trigger_auto_generate_staff_code
  BEFORE INSERT ON platform_staff
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_staff_code();

-- تحديث جميع السجلات القديمة التي ليس لها staff_code
UPDATE platform_staff
SET staff_code = generate_unique_staff_code()
WHERE staff_code IS NULL;
