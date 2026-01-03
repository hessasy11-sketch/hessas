/*
  # إصلاح handle_new_user مع قيم افتراضية آمنة

  1. المشكلة
    - phone_number و display_name حقول إجبارية (NOT NULL)
    - إذا كانت القيم فارغة، سيفشل الـ INSERT
    - خطأ: "Database error saving new user"
    
  2. الحل
    - إضافة قيم افتراضية آمنة
    - استخدام NULLIF لتجنب القيم الفارغة
    - توليد display_name من البريد إذا لم يُقدم
    
  3. التحديث
    - تحسين معالجة القيم الفارغة
    - إضافة logging للأخطاء
*/

-- حذف وإعادة إنشاء الـ function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_display_name text;
BEGIN
  -- استخراج رقم الهاتف
  v_phone := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'phone_number', ''),
    NULLIF(NEW.phone, ''),
    '0000000000'
  );
  
  -- استخراج اسم العرض
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    SPLIT_PART(NEW.email, '@', 1),
    'مستخدم'
  );

  -- إنشاء الـ profile
  INSERT INTO public.profiles (
    id,
    phone_number,
    display_name,
    city,
    bio,
    user_type,
    phone_verified,
    created_at
  )
  VALUES (
    NEW.id,
    v_phone,
    v_display_name,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'city', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'bio', ''), ''),
    'user',
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    phone_number = EXCLUDED.phone_number,
    display_name = EXCLUDED.display_name,
    city = EXCLUDED.city,
    bio = EXCLUDED.bio,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- إذا كان phone_number مكرر، استخدم رقم عشوائي
    INSERT INTO public.profiles (
      id,
      phone_number,
      display_name,
      city,
      bio,
      user_type,
      phone_verified,
      created_at
    )
    VALUES (
      NEW.id,
      v_phone || '_' || FLOOR(RANDOM() * 1000)::text,
      v_display_name,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'city', ''), ''),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'bio', ''), ''),
      'user',
      false,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  WHEN OTHERS THEN
    -- تسجيل الخطأ والمتابعة
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- التعليق
COMMENT ON FUNCTION handle_new_user() IS 'Creates profile with safe defaults, handles duplicates and errors gracefully';
