/*
  # إصلاح trigger إنشاء profiles تلقائياً

  1. المشكلة
    - عند إنشاء مستخدم جديد عبر auth.users لا يتم إنشاء profile
    - هذا يسبب خطأ "Database error saving new user"
    
  2. الحل
    - إنشاء trigger يستمع لحدث auth.users insert
    - إنشاء profile تلقائياً بالبيانات من raw_user_meta_data
    
  3. التفاصيل
    - Function: handle_new_user()
    - Trigger: on_auth_user_created
    - Event: AFTER INSERT ON auth.users
*/

-- حذف الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- إنشاء function جديدة لمعالجة المستخدمين الجدد
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'مستخدم'),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    'user',
    false,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger جديد
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- التعليق على الـ function
COMMENT ON FUNCTION handle_new_user() IS 'Creates a profile automatically when a new user signs up';
