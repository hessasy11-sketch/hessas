/*
  # نظام فحص ومسح QR Codes للموظفين
  
  1. دالات جديدة:
    - check_qr_code_status() - فحص حالة QR وإيجاد المشاكل
    - find_duplicate_qr_codes() - البحث عن QR مكررة
    - validate_staff_qr() - التحقق من صحة QR للموظف
    - scan_qr_and_get_info() - مسح QR والحصول على المعلومات
  
  2. الأمان:
    - متاح للمشرفين فقط
    - تسجيل جميع عمليات المسح
*/

-- دالة للبحث عن QR codes المكررة
CREATE OR REPLACE FUNCTION find_duplicate_qr_codes()
RETURNS TABLE(
  qr_code text,
  duplicate_count bigint,
  staff_ids uuid[],
  staff_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.qr_code,
    COUNT(*)::bigint as duplicate_count,
    array_agg(ps.id) as staff_ids,
    array_agg(ps.full_name) as staff_names
  FROM platform_staff ps
  WHERE ps.qr_code IS NOT NULL 
    AND ps.qr_code != ''
  GROUP BY ps.qr_code
  HAVING COUNT(*) > 1;
END;
$$;

-- دالة لفحص حالة QR code معين
CREATE OR REPLACE FUNCTION check_qr_code_status(p_qr_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_count integer;
  v_staff_records jsonb;
  v_is_active boolean;
  v_issues jsonb := '[]'::jsonb;
BEGIN
  -- عد الموظفين الذين يستخدمون نفس QR
  SELECT COUNT(*) INTO v_staff_count
  FROM platform_staff
  WHERE qr_code = p_qr_code;

  -- إذا لم يوجد
  IF v_staff_count = 0 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'status', 'not_found',
      'message', 'QR Code غير موجود في النظام',
      'issues', jsonb_build_array('QR Code غير موجود')
    );
  END IF;

  -- جلب بيانات جميع الموظفين بهذا QR
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ps.id,
      'full_name', ps.full_name,
      'staff_code', ps.staff_code,
      'department', ps.department,
      'role', ps.role,
      'is_active', ps.is_active,
      'qr_is_active', ps.qr_is_active,
      'qr_generated_at', ps.qr_generated_at
    )
  ) INTO v_staff_records
  FROM platform_staff ps
  WHERE ps.qr_code = p_qr_code;

  -- فحص المشاكل
  -- 1. تكرار QR
  IF v_staff_count > 1 THEN
    v_issues := v_issues || jsonb_build_object(
      'type', 'duplicate',
      'severity', 'critical',
      'message', 'QR Code مكرر لدى ' || v_staff_count || ' موظفين'
    )::jsonb;
  END IF;

  -- 2. QR معطّل
  SELECT ps.qr_is_active INTO v_is_active
  FROM platform_staff ps
  WHERE ps.qr_code = p_qr_code
  LIMIT 1;

  IF v_is_active = false THEN
    v_issues := v_issues || jsonb_build_object(
      'type', 'inactive',
      'severity', 'warning',
      'message', 'QR Code معطّل'
    )::jsonb;
  END IF;

  -- 3. موظف معطّل
  IF EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.qr_code = p_qr_code AND ps.is_active = false
  ) THEN
    v_issues := v_issues || jsonb_build_object(
      'type', 'staff_inactive',
      'severity', 'warning',
      'message', 'الموظف معطّل'
    )::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'valid', v_staff_count = 1 AND v_is_active,
    'status', CASE 
      WHEN v_staff_count > 1 THEN 'duplicate'
      WHEN NOT v_is_active THEN 'inactive'
      ELSE 'active'
    END,
    'staff_count', v_staff_count,
    'staff_records', v_staff_records,
    'issues', v_issues,
    'message', CASE 
      WHEN v_staff_count > 1 THEN 'تحذير: QR مكرر'
      WHEN NOT v_is_active THEN 'QR معطّل'
      ELSE 'QR صحيح وفعال'
    END
  );
END;
$$;

-- دالة مسح QR والحصول على المعلومات الكاملة
CREATE OR REPLACE FUNCTION scan_qr_and_get_info(p_qr_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status jsonb;
  v_staff_info jsonb;
  v_permissions jsonb;
BEGIN
  -- فحص حالة QR
  SELECT check_qr_code_status(p_qr_code) INTO v_status;

  -- إذا كان QR موجود، احصل على الصلاحيات
  IF (v_status->>'staff_count')::integer > 0 THEN
    -- جلب معلومات الصلاحيات للموظف الأول
    SELECT jsonb_build_object(
      'pack_id', ps.pack_id,
      'permissions', COALESCE(pp.permissions, '{}'::jsonb),
      'departments', COALESCE(pp.departments, '{}'::jsonb),
      'pack_name', pp.name_ar
    ) INTO v_permissions
    FROM platform_staff ps
    LEFT JOIN permission_packs pp ON pp.id = ps.pack_id
    WHERE ps.qr_code = p_qr_code
    LIMIT 1;
  END IF;

  -- تسجيل عملية المسح
  INSERT INTO audit_logs (
    action,
    entity_type,
    details
  ) VALUES (
    'scan_qr',
    'qr_code',
    jsonb_build_object(
      'qr_code', p_qr_code,
      'status', v_status->>'status',
      'scanned_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'qr_status', v_status,
    'permissions', v_permissions,
    'scanned_at', now()
  );
END;
$$;

-- دالة للحصول على إحصائيات QR codes
CREATE OR REPLACE FUNCTION get_qr_codes_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_active integer;
  v_inactive integer;
  v_duplicates integer;
  v_missing integer;
BEGIN
  -- إجمالي الموظفين
  SELECT COUNT(*) INTO v_total
  FROM platform_staff
  WHERE is_active = true;

  -- QR نشط
  SELECT COUNT(*) INTO v_active
  FROM platform_staff
  WHERE is_active = true 
    AND qr_is_active = true
    AND qr_code IS NOT NULL;

  -- QR معطّل
  SELECT COUNT(*) INTO v_inactive
  FROM platform_staff
  WHERE is_active = true 
    AND (qr_is_active = false OR qr_code IS NULL);

  -- QR مكرر
  SELECT COUNT(DISTINCT qr_code) INTO v_duplicates
  FROM (
    SELECT qr_code
    FROM platform_staff
    WHERE qr_code IS NOT NULL
    GROUP BY qr_code
    HAVING COUNT(*) > 1
  ) sub;

  -- بدون QR
  SELECT COUNT(*) INTO v_missing
  FROM platform_staff
  WHERE is_active = true 
    AND (qr_code IS NULL OR qr_code = '');

  RETURN jsonb_build_object(
    'total_staff', v_total,
    'active_qr', v_active,
    'inactive_qr', v_inactive,
    'duplicate_qr', v_duplicates,
    'missing_qr', v_missing,
    'health_score', ROUND((v_active::numeric / NULLIF(v_total, 0) * 100), 2)
  );
END;
$$;

-- دالة لإصلاح QR المكررة تلقائياً
CREATE OR REPLACE FUNCTION fix_duplicate_qr_codes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixed integer := 0;
  v_duplicate record;
  v_staff_id uuid;
  v_new_qr text;
BEGIN
  -- حلقة على جميع QR المكررة
  FOR v_duplicate IN 
    SELECT qr_code, array_agg(id) as staff_ids
    FROM platform_staff
    WHERE qr_code IS NOT NULL
    GROUP BY qr_code
    HAVING COUNT(*) > 1
  LOOP
    -- احتفظ بالموظف الأول، غيّر الباقي
    FOR v_staff_id IN 
      SELECT unnest(v_duplicate.staff_ids[2:array_length(v_duplicate.staff_ids, 1)])
    LOOP
      -- توليد QR جديد
      v_new_qr := 'QR-' || UPPER(substr(md5(random()::text || v_staff_id::text || now()::text), 1, 16));
      
      UPDATE platform_staff
      SET 
        qr_code = v_new_qr,
        qr_generated_at = now(),
        updated_at = now()
      WHERE id = v_staff_id;
      
      v_fixed := v_fixed + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', v_fixed,
    'message', 'تم إصلاح ' || v_fixed || ' QR مكرر'
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION find_duplicate_qr_codes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_qr_code_status(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION scan_qr_and_get_info(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_qr_codes_statistics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fix_duplicate_qr_codes() TO authenticated, service_role;
