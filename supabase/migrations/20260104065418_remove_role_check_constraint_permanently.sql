/*
  # حذف قيد CHECK على حقل role في platform_staff بشكل نهائي

  1. المشكلة
    - قيد CHECK يحد قيم role إلى قائمة محددة فقط
    - يمنع إضافة موظفين بأدوار جديدة ديناميكية

  2. الحل
    - حذف القيد نهائياً
    - السماح بأي قيمة في حقل role
    - النظام يستخدم أدوار ديناميكية من جدول platform_roles
*/

-- حذف قيد CHECK على حقل role
ALTER TABLE platform_staff
DROP CONSTRAINT IF EXISTS platform_staff_role_check;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN platform_staff.role IS 'كود الدور - يرتبط مع جدول platform_roles بشكل ديناميكي';

-- تحديث الإحصائيات
ANALYZE platform_staff;
