/*
  # نظام توليد QR تلقائياً للموظفين الجدد
  
  1. التغييرات:
    - Trigger لتوليد QR تلقائياً عند إضافة موظف
    - دالة لتوليد QR للموظفين الموجودين
    - دالة بديلة تستخدم qr_code بدلاً من qr_token
  
  2. الأمان:
    - QR يتم توليده تلقائياً وتفعيله
    - يمكن للمشرفين تعطيله إذا لزم الأمر
*/

-- دالة محسنة لتوليد QR باستخدام qr_code
CREATE OR REPLACE FUNCTION generate_qr_for_staff(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qr_code text;
  v_staff record;
BEGIN
  -- جلب بيانات الموظف
  SELECT 
    ps.*,
    p.display_name,
    p.phone_number
  INTO v_staff
  FROM platform_staff ps
  LEFT JOIN profiles p ON p.id = ps.user_id
  WHERE ps.id = p_staff_id;
  
  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الموظف غير موجود'
    );
  END IF;

  -- توليد QR code فريد
  v_qr_code := 'QR-' || UPPER(substr(md5(random()::text || p_staff_id::text || now()::text), 1, 16));

  -- تحديث الموظف بـ QR الجديد
  UPDATE platform_staff 
  SET 
    qr_code = v_qr_code,
    qr_is_active = true,
    qr_generated_at = now(),
    updated_at = now()
  WHERE id = p_staff_id;

  RETURN jsonb_build_object(
    'success', true,
    'qr_code', v_qr_code,
    'staff_id', p_staff_id,
    'staff_name', COALESCE(v_staff.display_name, v_staff.full_name, 'موظف'),
    'message', 'تم توليد QR بنجاح'
  );
END;
$$;

-- دالة لتوليد QR لجميع الموظفين الذين لا يملكون واحد
CREATE OR REPLACE FUNCTION generate_qr_for_all_staff()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_staff_record record;
  v_result jsonb;
BEGIN
  -- حلقة على جميع الموظفين النشطين بدون QR
  FOR v_staff_record IN 
    SELECT id, full_name 
    FROM platform_staff 
    WHERE (qr_code IS NULL OR qr_code = '') 
    AND is_active = true
  LOOP
    -- توليد QR لكل موظف
    SELECT generate_qr_for_staff(v_staff_record.id) INTO v_result;
    
    IF (v_result->>'success')::boolean THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'message', 'تم توليد ' || v_count || ' QR code'
  );
END;
$$;

-- Trigger لتوليد QR تلقائياً عند إضافة موظف جديد
CREATE OR REPLACE FUNCTION auto_generate_qr_on_staff_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qr_code text;
BEGIN
  -- توليد QR code فريد
  v_qr_code := 'QR-' || UPPER(substr(md5(random()::text || NEW.id::text || now()::text), 1, 16));
  
  -- تعيين QR للموظف الجديد
  NEW.qr_code := v_qr_code;
  NEW.qr_is_active := true;
  NEW.qr_generated_at := now();
  
  RETURN NEW;
END;
$$;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_qr ON platform_staff;
CREATE TRIGGER trigger_auto_generate_qr
  BEFORE INSERT ON platform_staff
  FOR EACH ROW
  WHEN (NEW.qr_code IS NULL)
  EXECUTE FUNCTION auto_generate_qr_on_staff_insert();

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION generate_qr_for_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_qr_for_all_staff() TO authenticated, service_role;

-- توليد QR لجميع الموظفين الموجودين بدون QR
SELECT generate_qr_for_all_staff();
