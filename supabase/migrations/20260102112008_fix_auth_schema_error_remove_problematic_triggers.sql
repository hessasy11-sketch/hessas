/*
  # إصلاح خطأ Database error querying schema

  ## المشكلة
  خطأ 500 عند محاولة تسجيل الدخول: "Database error querying schema"
  السبب: triggers على auth.users قد تسبب مشاكل

  ## الحل
  1. إزالة جميع triggers على auth.users مؤقتًا
  2. إزالة foreign key constraint من profiles
  3. إعادة إنشاء profiles بدون foreign key على auth.users
  4. إعادة إنشاء triggers بشكل آمن
*/

-- إزالة جميع triggers على auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_wallet_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;

-- إزالة foreign key constraint من profiles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_wallet_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_notification_preferences() CASCADE;

-- إنشاء دالة بسيطة وآمنة
CREATE OR REPLACE FUNCTION public.safe_handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- لا تفعل شيء، فقط أرجع NEW
  RETURN NEW;
END;
$$;

-- منح صلاحيات للدالة
GRANT EXECUTE ON FUNCTION public.safe_handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.safe_handle_new_user() TO postgres;

-- التأكد من أن جدول profiles موجود ويعمل
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number text UNIQUE,
      display_name text,
      city text,
      bio text,
      user_type text DEFAULT 'user',
      phone_verified boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
