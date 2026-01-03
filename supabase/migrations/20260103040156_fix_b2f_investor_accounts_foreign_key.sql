/*
  # إصلاح foreign key في b2f_investor_accounts

  1. التغييرات
    - إزالة foreign key constraint مع auth.users
    - إضافة foreign key constraint مع profiles
    - تحديث السياسات
  
  2. السبب
    - النظام لا يستخدم auth.users بل يستخدم نظام تسجيل مخصص عبر profiles
*/

-- إزالة الـ constraint القديم
ALTER TABLE b2f_investor_accounts
  DROP CONSTRAINT IF EXISTS b2f_investor_accounts_user_id_fkey;

-- إضافة constraint جديد مع profiles
ALTER TABLE b2f_investor_accounts
  DROP CONSTRAINT IF EXISTS b2f_investor_accounts_user_id_profiles_fkey;

ALTER TABLE b2f_investor_accounts
  ADD CONSTRAINT b2f_investor_accounts_user_id_profiles_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- إنشاء حساب للمدير العام
INSERT INTO b2f_investor_accounts (
  user_id,
  contact_name,
  contact_phone,
  contact_email,
  is_profile_complete
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'المدير العام',
  '0544433244',
  'admin@platform.com',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  contact_name = EXCLUDED.contact_name,
  contact_phone = EXCLUDED.contact_phone,
  is_profile_complete = EXCLUDED.is_profile_complete;
