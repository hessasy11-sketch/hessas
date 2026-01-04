/*
  # إنشاء باركود جديد للدخول على لوحة الإدارة العليا

  1. الإنشاء
    - إنشاء حساب مدير نظام جديد
    - تفعيل الرقم السري = 5678
    - إنشاء QR فريد
    - التوجيه إلى /hq

  2. الأمان
    - استخدام crypt لتشفير الرمز السري
    - QR نشط ومؤمن
*/

-- إنشاء مدير نظام جديد
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
  'مدير النظام',
  '0500000002',
  'admin',
  'مدير النظام',
  'الإدارة العليا',
  'ADMIN-HQ-2026',
  true,
  true,
  crypt('5678', gen_salt('bf')),
  0,
  true,
  now(),
  now()
)
ON CONFLICT (phone_number) DO UPDATE SET
  role = 'admin',
  job_title = 'مدير النظام',
  requires_pin = true,
  pin_code = crypt('5678', gen_salt('bf')),
  qr_is_active = true,
  is_active = true,
  qr_code = 'ADMIN-HQ-2026';

-- إظهار تفاصيل المدير الجديد
DO $$
DECLARE
  v_admin RECORD;
BEGIN
  SELECT 
    id,
    full_name,
    phone_number,
    role,
    job_title,
    qr_code,
    requires_pin,
    department
  INTO v_admin
  FROM platform_staff
  WHERE qr_code = 'ADMIN-HQ-2026'
  LIMIT 1;

  IF FOUND THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'تم إنشاء حساب المدير بنجاح';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'الاسم: %', v_admin.full_name;
    RAISE NOTICE 'الهاتف: %', v_admin.phone_number;
    RAISE NOTICE 'الدور: %', v_admin.role;
    RAISE NOTICE 'المسمى الوظيفي: %', v_admin.job_title;
    RAISE NOTICE 'القسم: %', v_admin.department;
    RAISE NOTICE 'رمز QR: %', v_admin.qr_code;
    RAISE NOTICE 'يتطلب PIN: %', v_admin.requires_pin;
    RAISE NOTICE 'رمز PIN: 5678';
    RAISE NOTICE 'المسار: /hq';
    RAISE NOTICE '========================================';
  END IF;
END $$;
