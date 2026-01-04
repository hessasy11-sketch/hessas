/*
  # إنشاء حساب المدير العام مع الرقم السري

  1. الإنشاء
    - إنشاء حساب المدير العام بدور general_manager
    - تفعيل الرقم السري = 1234
    - إنشاء QR خاص به
    - التوجيه إلى /hq

  2. الأمان
    - استخدام crypt لتشفير الرمز السري
    - QR نشط ومؤمن
*/

-- حذف أي حساب قديم للمدير العام بدور general_manager
DELETE FROM platform_staff WHERE role = 'general_manager';

-- إنشاء المدير العام الجديد
INSERT INTO platform_staff (
  id,
  user_id,
  full_name,
  phone_number,
  role,
  job_title,
  department,
  qr_code,
  qr_is_active,
  requires_pin,
  pin_code,
  pin_attempts,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  NULL,
  'المدير العام',
  '0500000001',
  'general_manager',
  'المدير العام',
  'الإدارة العليا',
  'GM-SECURE-2026',
  true,
  true,
  crypt('1234', gen_salt('bf')),
  0,
  true,
  now(),
  now()
)
ON CONFLICT (phone_number) DO UPDATE SET
  role = 'general_manager',
  job_title = 'المدير العام',
  requires_pin = true,
  pin_code = crypt('1234', gen_salt('bf')),
  qr_is_active = true,
  is_active = true;

-- إظهار تفاصيل المدير العام
DO $$
DECLARE
  v_gm RECORD;
BEGIN
  SELECT 
    id,
    full_name,
    phone_number,
    role,
    job_title,
    qr_code,
    requires_pin
  INTO v_gm
  FROM platform_staff
  WHERE role = 'general_manager'
  LIMIT 1;

  IF FOUND THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'تم إنشاء المدير العام بنجاح';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'الاسم: %', v_gm.full_name;
    RAISE NOTICE 'الهاتف: %', v_gm.phone_number;
    RAISE NOTICE 'الدور: %', v_gm.role;
    RAISE NOTICE 'المسمى الوظيفي: %', v_gm.job_title;
    RAISE NOTICE 'رمز QR: %', v_gm.qr_code;
    RAISE NOTICE 'يتطلب PIN: %', v_gm.requires_pin;
    RAISE NOTICE 'رمز PIN: 1234';
    RAISE NOTICE 'المسار: /hq';
    RAISE NOTICE '========================================';
  END IF;
END $$;
