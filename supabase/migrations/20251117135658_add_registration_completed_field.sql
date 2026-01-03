/*
  # إضافة حقل لتتبع إكمال التسجيل

  1. المشكلة
    - بعد التسجيل، البطاقة "استكمال التسجيل" لا تتغير
    - لا يوجد حقل واضح لمعرفة إذا أكمل المستخدم التسجيل
    - city و bio اختيارية، لذلك لا يمكن الاعتماد عليها
    
  2. الحل
    - إضافة حقل registration_completed (boolean)
    - يتم تعيينه لـ true عند إكمال التسجيل
    - يتم تحديثه تلقائياً عند وجود الحد الأدنى من البيانات
    
  3. الحقول الإجبارية للتسجيل المكتمل
    - display_name ✅
    - phone_number ✅
    - city ✅ (سيصبح إجباري)
*/

-- إضافة حقل registration_completed
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS registration_completed boolean DEFAULT false;

-- تحديث السجلات الموجودة (اعتبار التسجيل مكتمل إذا كانت البيانات الأساسية موجودة)
UPDATE profiles
SET registration_completed = true
WHERE display_name IS NOT NULL 
  AND display_name != '' 
  AND phone_number IS NOT NULL 
  AND phone_number != ''
  AND (city IS NOT NULL AND city != '');

-- إنشاء دالة لتحديث حالة التسجيل تلقائياً
CREATE OR REPLACE FUNCTION update_registration_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- إذا كانت البيانات الأساسية مكتملة، نعتبر التسجيل مكتمل
  IF NEW.display_name IS NOT NULL 
     AND NEW.display_name != '' 
     AND NEW.phone_number IS NOT NULL 
     AND NEW.phone_number != ''
     AND NEW.city IS NOT NULL 
     AND NEW.city != '' THEN
    NEW.registration_completed := true;
  ELSE
    NEW.registration_completed := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لتحديث حالة التسجيل عند INSERT أو UPDATE
DROP TRIGGER IF EXISTS update_registration_status_trigger ON profiles;

CREATE TRIGGER update_registration_status_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_registration_status();

-- إضافة index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_profiles_registration_completed 
ON profiles(registration_completed);

-- تعليق
COMMENT ON COLUMN profiles.registration_completed IS 'Indicates if user has completed the registration process (display_name, phone_number, and city are filled)';
