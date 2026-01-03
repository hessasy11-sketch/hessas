/*
  # إنشاء trigger تلقائي لإنشاء profiles

  1. المشكلة
    - عند إنشاء مستخدم جديد، قد لا يتم إنشاء profile فوراً
    - Foreign key constraint يمنع إنشاء auctions بدون profile
    
  2. الحل
    - إنشاء function يتحقق من وجود profile ويُنشئه إذا لم يكن موجود
    - استخدام هذه الـ function قبل إنشاء المزاد
*/

-- إنشاء function للتحقق من وجود profile أو إنشائه
CREATE OR REPLACE FUNCTION ensure_profile_exists(
  user_id uuid,
  phone text,
  name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, phone_number, display_name, user_type)
  VALUES (user_id, phone, name, 'individual')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- منح الصلاحية لجميع المستخدمين المسجلين
GRANT EXECUTE ON FUNCTION ensure_profile_exists(uuid, text, text) TO authenticated;
