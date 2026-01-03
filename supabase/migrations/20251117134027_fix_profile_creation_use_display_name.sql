/*
  # إصلاح إنشاء Profile لاستخدام الاسم الحقيقي

  1. المشكلة
    - عند التسجيل الأول، كان النظام يعرض رقم الجوال بدلاً من الاسم
    - السبب: الـ trigger يأخذ من الإيميل إذا لم يجد display_name
    
  2. الحل
    - إعطاء الأولوية لـ display_name من raw_user_meta_data
    - عدم استخدام رقم الجوال كاسم أبداً
    - استخدام "مستخدم" فقط إذا لم يتم تقديم اسم
    
  3. الأمان
    - رقم الجوال للاستخدام الداخلي فقط (التحقق، تسجيل الدخول)
    - display_name هو الهوية الظاهرة في كل مكان
*/

-- حذف الـ function القديمة
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- إنشاء الـ function الجديدة مع الإصلاح
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
  -- استخراج رقم الهاتف (للاستخدام الداخلي فقط)
  v_phone := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'phone_number', ''),
    NULLIF(NEW.phone, ''),
    '0000000000'
  );
  
  -- استخراج اسم العرض (الهوية الظاهرة)
  -- الأولوية الأولى: display_name من metadata (الاسم الذي أدخله المستخدم)
  -- الأولوية الثانية: "مستخدم" كقيمة افتراضية
  -- ❌ لا نستخدم رقم الجوال أو الإيميل كاسم أبداً
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
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

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile using display_name from metadata, never uses phone or email as name';
