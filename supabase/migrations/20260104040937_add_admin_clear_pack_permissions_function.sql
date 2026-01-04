/*
  # إضافة دالة لحذف جميع صلاحيات حزمة معينة

  1. الحاجة
    - عند تحديث حزمة، نحتاج لحذف جميع الصلاحيات القديمة أولاً
    - ثم إضافة الصلاحيات الجديدة
    
  2. الدالة الجديدة
    - admin_clear_pack_permissions: تحذف جميع صلاحيات حزمة معينة
    - تتحقق من صلاحية المدير قبل الحذف
    
  3. الأمان
    - فقط المدراء يمكنهم استخدام هذه الدالة
*/

-- دالة لحذف جميع صلاحيات حزمة معينة
CREATE OR REPLACE FUNCTION admin_clear_pack_permissions(
  p_staff_id uuid,
  p_pack_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحية المدير
  IF NOT is_platform_admin(p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بحذف الصلاحيات'
    );
  END IF;

  -- حذف جميع صلاحيات الحزمة
  DELETE FROM pack_permissions WHERE pack_id = p_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حذف جميع الصلاحيات بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء حذف الصلاحيات: ' || SQLERRM
    );
END;
$$;
