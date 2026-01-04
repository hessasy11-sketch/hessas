/*
  # إنشاء نظام تسجيل الدخول للمستثمرين
  
  1. الدوال
    - دالة إنشاء حساب مستثمر جديد
    - دالة تسجيل دخول المستثمر
    - دالة التحقق من رقم الجوال
*/

-- دالة إنشاء حساب مستثمر جديد
CREATE OR REPLACE FUNCTION create_investor_account(
  p_phone text,
  p_pin text,
  p_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id uuid;
  v_existing_account uuid;
BEGIN
  -- التحقق من عدم وجود حساب بنفس الرقم
  SELECT id INTO v_existing_account
  FROM b2f_investor_accounts
  WHERE contact_phone = p_phone;

  IF v_existing_account IS NOT NULL THEN
    RAISE EXCEPTION 'هذا الرقم مسجل مسبقاً';
  END IF;

  -- التحقق من صحة PIN
  IF LENGTH(p_pin) < 6 THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تكون 6 أرقام على الأقل';
  END IF;

  IF p_pin !~ '^\d+$' THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تحتوي على أرقام فقط';
  END IF;

  -- إنشاء الحساب
  INSERT INTO b2f_investor_accounts (
    id,
    contact_name,
    contact_phone,
    pin_code,
    is_profile_complete,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_name,
    p_phone,
    crypt(p_pin, gen_salt('bf')),
    true,
    now(),
    now()
  )
  RETURNING id INTO v_account_id;

  -- إرجاع معلومات الحساب
  RETURN json_build_object(
    'success', true,
    'account_id', v_account_id,
    'message', 'تم إنشاء الحساب بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- دالة تسجيل دخول المستثمر
CREATE OR REPLACE FUNCTION verify_investor_login(
  p_phone text,
  p_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account record;
  v_pin_valid boolean;
BEGIN
  -- البحث عن الحساب
  SELECT 
    id,
    contact_name,
    contact_phone,
    contact_email,
    pin_code,
    is_profile_complete
  INTO v_account
  FROM b2f_investor_accounts
  WHERE contact_phone = p_phone;

  -- التحقق من وجود الحساب
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'رقم الجوال أو كلمة المرور غير صحيحة'
    );
  END IF;

  -- التحقق من كلمة المرور
  v_pin_valid := (v_account.pin_code = crypt(p_pin, v_account.pin_code));

  IF NOT v_pin_valid THEN
    RETURN json_build_object(
      'success', false,
      'error', 'رقم الجوال أو كلمة المرور غير صحيحة'
    );
  END IF;

  -- إرجاع معلومات الحساب
  RETURN json_build_object(
    'success', true,
    'account', json_build_object(
      'id', v_account.id,
      'contact_name', v_account.contact_name,
      'contact_phone', v_account.contact_phone,
      'contact_email', v_account.contact_email,
      'is_profile_complete', v_account.is_profile_complete
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'حدث خطأ في العملية'
    );
END;
$$;

-- دالة التحقق من وجود رقم جوال
CREATE OR REPLACE FUNCTION check_investor_phone_exists(
  p_phone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM b2f_investor_accounts 
    WHERE contact_phone = p_phone
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- دالة الحصول على معلومات المستثمر بالرقم
CREATE OR REPLACE FUNCTION get_investor_by_phone(
  p_phone text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account record;
BEGIN
  SELECT 
    id,
    contact_name,
    contact_phone,
    contact_email,
    is_profile_complete,
    created_at
  INTO v_account
  FROM b2f_investor_accounts
  WHERE contact_phone = p_phone;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'id', v_account.id,
    'contact_name', v_account.contact_name,
    'contact_phone', v_account.contact_phone,
    'contact_email', v_account.contact_email,
    'is_profile_complete', v_account.is_profile_complete,
    'created_at', v_account.created_at
  );
END;
$$;