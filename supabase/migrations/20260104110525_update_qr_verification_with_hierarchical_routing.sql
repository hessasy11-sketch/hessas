/*
  # تحديث نظام QR ليستخدم التوجيه الهرمي
  
  1. التحديثات:
    - تحديث verify_qr_access لاستخدام sub_sections
    - التوجيه الذكي للتاب المحدد حسب القسم الفرعي
  
  2. المخرجات:
    - route: المسار الكامل مع التاب
    - tab_name: اسم التاب المحدد
    - department_info: معلومات القسم الكاملة
*/

-- تحديث دالة verify_qr_access لدعم التوجيه الهرمي
DROP FUNCTION IF EXISTS verify_qr_access(text);

CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_routing_info RECORD;
  v_result jsonb;
BEGIN
  -- البحث عن الموظف بالـ QR
  SELECT 
    ps.*,
    pd.id as department_id,
    pd.name_ar as department_name_ar,
    pd.name_en as department_name_en,
    pd.sub_section_id
  INTO v_staff_record
  FROM platform_staff ps
  LEFT JOIN platform_departments pd ON ps.department = pd.code
  WHERE ps.qr_code = p_qr_code
    AND ps.is_active = true
    AND (ps.qr_expires_at IS NULL OR ps.qr_expires_at > now());
  
  -- إذا لم يتم العثور على الموظف
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'رمز QR غير صالح أو منتهي الصلاحية'
    );
  END IF;
  
  -- الحصول على معلومات التوجيه
  IF v_staff_record.sub_section_id IS NOT NULL THEN
    SELECT 
      ms.code as main_section_code,
      ms.name_ar as main_section_name,
      ms.base_route,
      ss.code as sub_section_code,
      ss.name_ar as sub_section_name,
      ss.route_path,
      ss.tab_name
    INTO v_routing_info
    FROM sub_sections ss
    JOIN main_sections ms ON ss.main_section_id = ms.id
    WHERE ss.id = v_staff_record.sub_section_id
      AND ss.is_active = true
      AND ms.is_active = true;
  END IF;
  
  -- تسجيل محاولة الوصول
  INSERT INTO audit_logs (
    action_type,
    staff_id,
    details,
    ip_address
  ) VALUES (
    'qr_scan',
    v_staff_record.id,
    jsonb_build_object(
      'qr_code', p_qr_code,
      'staff_name', v_staff_record.full_name,
      'department', v_staff_record.department_name_ar,
      'routing', CASE 
        WHEN v_routing_info IS NOT NULL THEN
          jsonb_build_object(
            'main_section', v_routing_info.main_section_name,
            'sub_section', v_routing_info.sub_section_name,
            'route', v_routing_info.route_path
          )
        ELSE NULL
      END
    ),
    inet_client_addr()
  );
  
  -- إنشاء الاستجابة
  v_result := jsonb_build_object(
    'success', true,
    'staff_id', v_staff_record.id,
    'staff_code', v_staff_record.staff_code,
    'full_name', v_staff_record.full_name,
    'role', v_staff_record.role,
    'department', v_staff_record.department,
    'department_name_ar', v_staff_record.department_name_ar,
    'department_name_en', v_staff_record.department_name_en,
    'needs_pin', COALESCE(v_staff_record.requires_pin, false),
    'is_temporary', COALESCE(v_staff_record.is_temporary, false),
    'qr_type', CASE 
      WHEN v_staff_record.is_temporary THEN 'temporary'
      ELSE 'permanent'
    END
  );
  
  -- إضافة معلومات التوجيه إذا كانت موجودة
  IF v_routing_info IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'routing', jsonb_build_object(
        'route', v_routing_info.route_path,
        'base_route', v_routing_info.base_route,
        'tab_name', v_routing_info.tab_name,
        'main_section', jsonb_build_object(
          'code', v_routing_info.main_section_code,
          'name', v_routing_info.main_section_name
        ),
        'sub_section', jsonb_build_object(
          'code', v_routing_info.sub_section_code,
          'name', v_routing_info.sub_section_name
        )
      )
    );
  ELSE
    -- التوجيه الافتراضي حسب الدور
    v_result := v_result || jsonb_build_object(
      'routing', jsonb_build_object(
        'route', CASE v_staff_record.role
          WHEN 'super_admin' THEN '/hq-dashboard'
          WHEN 'admin' THEN '/hq-dashboard'
          WHEN 'general_manager' THEN '/hq-dashboard'
          ELSE '/dashboard'
        END,
        'tab_name', NULL,
        'main_section', NULL,
        'sub_section', NULL
      )
    );
  END IF;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION verify_qr_access IS 'التحقق من QR مع التوجيه الهرمي الذكي للأقسام والتابات';
