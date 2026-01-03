/*
  # إعادة تعيين كاملة لحسابات المسؤولين

  ## الوصف
  حذف وإعادة إنشاء حسابات المسؤولين بشكل كامل

  ## التغييرات
  1. حذف profiles للمسؤولين
  2. حذف auth.users للمسؤولين
  3. إعادة إنشاء الحسابات بشكل صحيح

  ## بيانات الدخول النهائية
  - رقم: 0500000000 | كلمة المرور: admin123
  - رقم: 0511111110 | كلمة المرور: 1111
*/

-- حذف profiles القديمة
DELETE FROM public.profiles 
WHERE phone_number IN ('0500000000', '0511111110');

-- حذف auth.users القديمة
DELETE FROM auth.users 
WHERE email IN ('0500000000@agriauction.demo', '0511111110@agriauction.demo')
   OR phone IN ('0500000000', '0511111110');

-- إنشاء الحساب الأول: 0500000000
DO $$
DECLARE
  admin_id_1 uuid := gen_random_uuid();
BEGIN
  -- إنشاء مستخدم في auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_id_1,
    'authenticated',
    'authenticated',
    '0500000000@agriauction.demo',
    crypt('admin123', gen_salt('bf')),
    now(),
    '0500000000',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"phone_number":"0500000000","display_name":"مدير النظام"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- إنشاء profile
  INSERT INTO public.profiles (
    id,
    phone_number,
    display_name,
    user_type,
    created_at,
    updated_at
  ) VALUES (
    admin_id_1,
    '0500000000',
    'مدير النظام',
    'platform_owner',
    now(),
    now()
  );

  RAISE NOTICE 'حساب مدير النظام تم إنشاؤه: 0500000000';
END $$;

-- إنشاء الحساب الثاني: 0511111110
DO $$
DECLARE
  admin_id_2 uuid := gen_random_uuid();
BEGIN
  -- إنشاء مستخدم في auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_id_2,
    'authenticated',
    'authenticated',
    '0511111110@agriauction.demo',
    crypt('1111', gen_salt('bf')),
    now(),
    '0511111110',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"phone_number":"0511111110","display_name":"المسؤول الرئيسي"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- إنشاء profile
  INSERT INTO public.profiles (
    id,
    phone_number,
    display_name,
    user_type,
    created_at,
    updated_at
  ) VALUES (
    admin_id_2,
    '0511111110',
    'المسؤول الرئيسي',
    'platform_owner',
    now(),
    now()
  );

  RAISE NOTICE 'حساب المسؤول الرئيسي تم إنشاؤه: 0511111110';
END $$;

-- التحقق النهائي
DO $$
DECLARE
  total_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE p.user_type = 'platform_owner';
  
  RAISE NOTICE 'إجمالي الحسابات الإدارية: %', total_count;
END $$;
