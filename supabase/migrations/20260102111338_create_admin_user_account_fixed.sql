/*
  # إنشاء حساب المسؤول - إصدار محسّن

  ## الوصف
  إنشاء حساب المسؤول الافتراضي في النظام

  ## التغييرات
  1. إنشاء المسؤول في auth.users
  2. إنشاء profile للمسؤول
  3. تعيين كلمة المرور الافتراضية '1111'

  ## بيانات المسؤول
  - رقم الهاتف: 0511111110
  - البريد الإلكتروني: 0511111110@agriauction.demo
  - كلمة المرور: 1111
  - النوع: admin
*/

-- حذف المسؤول القديم إن وُجد
DELETE FROM auth.users WHERE email = '0511111110@agriauction.demo';

-- إنشاء حساب المسؤول في auth.users
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- إنشاء المستخدم
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    '0511111110@agriauction.demo',
    crypt('1111', gen_salt('bf')),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"phone_number": "0511111110", "display_name": "المسؤول الرئيسي"}',
    false,
    now(),
    now(),
    '0511111110',
    now()
  )
  RETURNING id INTO admin_user_id;

  -- إنشاء profile للمسؤول
  INSERT INTO public.profiles (
    id,
    phone_number,
    display_name,
    user_type,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    '0511111110',
    'المسؤول الرئيسي',
    'admin',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE 
  SET user_type = 'admin',
      display_name = 'المسؤول الرئيسي',
      phone_number = '0511111110';

  RAISE NOTICE 'Admin user created successfully with ID: %', admin_user_id;
END $$;
