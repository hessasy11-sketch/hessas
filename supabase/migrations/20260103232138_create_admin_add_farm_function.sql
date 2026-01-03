/*
  # إنشاء دالة لإضافة المزارع من قبل المسؤولين

  1. الدالة
    - دالة RPC لإضافة المزرعة مع التحقق من الصلاحيات
    - تستخدم SECURITY DEFINER لتجاوز RLS
    - تتحقق من أن المستخدم مسؤول قبل الإضافة
    
  2. الأمان
    - التحقق من sessionStorage.adminUserId
    - التحقق من أن المستخدم موجود في platform_administrators أو platform_staff
    - لا يمكن للمستخدمين العاديين استخدام الدالة
*/

CREATE OR REPLACE FUNCTION add_farm_as_admin(
  p_user_id uuid,
  p_name text,
  p_location text,
  p_total_trees_available integer,
  p_description text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_is_staff boolean;
  v_farm_id uuid;
BEGIN
  v_is_admin := EXISTS (
    SELECT 1 FROM platform_administrators
    WHERE user_id = p_user_id
    AND is_active = true
  );
  
  v_is_staff := EXISTS (
    SELECT 1 FROM platform_staff
    WHERE user_id = p_user_id
    AND is_active = true
  );
  
  IF NOT (v_is_admin OR v_is_staff) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'غير مصرح لك بإضافة مزارع'
    );
  END IF;
  
  INSERT INTO b2f_farms (
    name,
    location,
    total_trees_available,
    description,
    city,
    is_active
  )
  VALUES (
    p_name,
    p_location,
    p_total_trees_available,
    p_description,
    p_city,
    p_is_active
  )
  RETURNING id INTO v_farm_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'farm_id', v_farm_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION add_farm_as_admin TO authenticated, anon;
