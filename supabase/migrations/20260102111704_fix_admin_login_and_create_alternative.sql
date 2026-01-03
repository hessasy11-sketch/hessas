/*
  # إصلاح تسجيل دخول المسؤول وإنشاء حساب بديل

  ## الوصف
  إعادة تعيين كلمة المرور للحساب الموجود وإنشاء حساب إداري بديل

  ## التغييرات
  1. إعادة تعيين كلمة المرور للحساب 0511111110
  2. إنشاء حساب إداري بديل برقم 0500000000

  ## بيانات تسجيل الدخول
  - الحساب الأول: 0511111110 / كلمة المرور: 1111
  - الحساب البديل: 0500000000 / كلمة المرور: admin123
*/

-- إعادة تعيين كلمة المرور للحساب الموجود
UPDATE auth.users
SET 
  encrypted_password = crypt('1111', gen_salt('bf')),
  email_confirmed_at = now(),
  confirmation_sent_at = now(),
  updated_at = now()
WHERE email = '0511111110@agriauction.demo';

-- حذف الحساب البديل إن وُجد
DELETE FROM auth.users WHERE email = '0500000000@agriauction.demo';

-- إنشاء حساب إداري بديل
DO $$
DECLARE
  new_admin_id uuid;
BEGIN
  -- إنشاء المستخدم البديل
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
    '0500000000@agriauction.demo',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"phone_number": "0500000000", "display_name": "مدير النظام"}',
    false,
    now(),
    now(),
    '0500000000',
    now()
  )
  RETURNING id INTO new_admin_id;

  -- إنشاء profile للمسؤول البديل
  INSERT INTO public.profiles (
    id,
    phone_number,
    display_name,
    user_type,
    created_at,
    updated_at
  ) VALUES (
    new_admin_id,
    '0500000000',
    'مدير النظام',
    'admin',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE 
  SET user_type = 'admin',
      display_name = 'مدير النظام',
      phone_number = '0500000000';

  RAISE NOTICE 'Alternative admin user created with ID: %', new_admin_id;
END $$;

-- التحقق من الحسابات الإدارية
DO $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE p.user_type = 'admin';
  
  RAISE NOTICE 'Total admin accounts: %', admin_count;
END $$;
