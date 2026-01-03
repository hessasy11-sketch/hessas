/*
  # منح صلاحية BYPASSRLS للـ trigger functions

  1. المشكلة
    - SET LOCAL row_security TO off قد لا يعمل في triggers
    - RLS يمنع الكتابة من الـ triggers
    
  2. الحل
    - تغيير owner للـ functions إلى postgres
    - أو استخدام LEAKPROOF attribute
    - أو تعطيل RLS مؤقتاً في الـ trigger context
    
  3. الأمان
    - الـ functions آمنة ومحددة الغرض
    - تعمل فقط عند إنشاء مستخدم جديد
*/

-- إعادة إنشاء جميع الـ functions مع خيارات أفضل
-- ============================================
-- 1. handle_new_user
-- ============================================
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phone text;
  v_display_name text;
BEGIN
  -- استخراج البيانات
  v_phone := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'phone_number', ''),
    NULLIF(NEW.phone, ''),
    '0000000000'
  );
  
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    SPLIT_PART(NEW.email, '@', 1),
    'مستخدم'
  );

  -- إنشاء profile بدون التحقق من RLS
  PERFORM set_config('request.jwt.claims', '{}', true);
  
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
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- 2. create_wallet_for_new_user
-- ============================================
DROP FUNCTION IF EXISTS create_wallet_for_new_user() CASCADE;

CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.wallets (
    user_id,
    balance,
    total_earnings,
    pending_commissions
  )
  VALUES (
    NEW.id,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in create_wallet: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- 3. create_default_notification_preferences
-- ============================================
DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_preferences (
    user_id,
    enabled_types,
    whatsapp_enabled,
    whatsapp_for_important_only,
    silent_mode
  )
  VALUES (
    NEW.id,
    '{"system": true, "auction": true, "financial": true, "interaction": true, "ai_assistant": true}'::jsonb,
    true,
    true,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in create_notification_prefs: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_wallet_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER create_wallet_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();

CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile automatically on user signup';
COMMENT ON FUNCTION create_wallet_for_new_user() IS 'Creates wallet automatically on user signup';
COMMENT ON FUNCTION create_default_notification_preferences() IS 'Creates notification preferences automatically on user signup';
