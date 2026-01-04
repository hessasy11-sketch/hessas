/*
  # إنشاء دالة لضبط متغيرات الجلسة

  1. New Functions
    - `set_session_var` - دالة لضبط متغير في الجلسة الحالية
*/

CREATE OR REPLACE FUNCTION set_session_var(key text, value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(key, value, false);
END;
$$;

GRANT EXECUTE ON FUNCTION set_session_var TO anon, authenticated, service_role;
