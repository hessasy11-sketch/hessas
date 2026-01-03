/*
  # إصلاح نهائي لحسابات المسؤولين - طريقة مبسطة

  ## الحل
  حذف وإعادة إنشاء الحسابات بشكل صحيح مع identities

  ## بيانات الدخول
  - 0500000000 / admin123
  - 0511111110 / 1111
*/

-- حذف كامل
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE phone IN ('0500000000', '0511111110')
);

DELETE FROM public.profiles WHERE phone_number IN ('0500000000', '0511111110');

DELETE FROM auth.users WHERE phone IN ('0500000000', '0511111110');

-- الحساب الأول: 0500000000
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  hashed_password text;
BEGIN
  hashed_password := crypt('admin123', gen_salt('bf'));
  
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
    new_user_id,
    'authenticated',
    'authenticated',
    '0500000000@agriauction.demo',
    hashed_password,
    now(),
    '0500000000',
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('phone_number', '0500000000', 'display_name', 'مدير النظام'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- إنشاء identity
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id::text,
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', '0500000000@agriauction.demo',
      'email_verified', true,
      'phone_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public.profiles (
    id,
    phone_number,
    display_name,
    user_type,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    '0500000000',
    'مدير النظام',
    'platform_owner',
    now(),
    now()
  );

  RAISE NOTICE 'تم: 0500000000 / admin123';
END $$;

-- الحساب الثاني: 0511111110
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  hashed_password text;
BEGIN
  hashed_password := crypt('1111', gen_salt('bf'));
  
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
    new_user_id,
    'authenticated',
    'authenticated',
    '0511111110@agriauction.demo',
    hashed_password,
    now(),
    '0511111110',
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('phone_number', '0511111110', 'display_name', 'المسؤول الرئيسي'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id::text,
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', '0511111110@agriauction.demo',
      'email_verified', true,
      'phone_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public.profiles (
    id,
    phone_number,
    display_name,
    user_type,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    '0511111110',
    'المسؤول الرئيسي',
    'platform_owner',
    now(),
    now()
  );

  RAISE NOTICE 'تم: 0511111110 / 1111';
END $$;
