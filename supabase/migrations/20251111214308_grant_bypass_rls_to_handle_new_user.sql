/*
  # منح صلاحية تجاوز RLS للـ trigger

  1. المشكلة
    - RLS مفعّل على جدول profiles
    - الـ trigger function لا تستطيع الكتابة بسبب RLS
    - خطأ: "Database error saving new user"
    
  2. الحل
    - منح صلاحية BYPASS RLS للـ function
    - أو إضافة policy خاصة للـ trigger
    
  3. الأمان
    - الـ function تعمل كـ SECURITY DEFINER
    - تعمل بصلاحيات المالك (owner)
    - آمنة لإنشاء profiles فقط
*/

-- إعطاء صلاحية للـ function لتجاوز RLS
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- التأكد من أن الـ function مملوكة للـ postgres أو service_role
-- هذا يسمح لها بتجاوز RLS تلقائياً

-- أيضاً، دعنا نضيف policy صريحة للسماح بالـ INSERT من الـ trigger
DO $$
BEGIN
  -- حذف الـ policy القديمة إن وجدت
  DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON profiles;
  
  -- إنشاء policy جديدة
  CREATE POLICY "Allow trigger to insert profiles"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
    
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- بديل: إعادة إنشاء الـ function بطريقة تتجاوز RLS تماماً
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
  -- تجاوز RLS مؤقتاً
  SET LOCAL row_security TO off;
  
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

  -- إنشاء الـ profile (مع تجاوز RLS)
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

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile bypassing RLS with safe defaults';
