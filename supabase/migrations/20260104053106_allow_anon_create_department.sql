/*
  # السماح بإنشاء الأقسام لجميع المستخدمين
  
  المشكلة:
  - دالة create_department تتطلب authenticated session
  - الموظفون الذين يدخلون عبر QR/PIN ليسوا authenticated
  
  الحل:
  - إضافة GRANT EXECUTE للـ anon أيضاً
*/

-- السماح بتنفيذ الدالة لجميع المستخدمين
GRANT EXECUTE ON FUNCTION create_department TO anon;
GRANT EXECUTE ON FUNCTION create_department TO authenticated;
GRANT EXECUTE ON FUNCTION create_department TO service_role;
