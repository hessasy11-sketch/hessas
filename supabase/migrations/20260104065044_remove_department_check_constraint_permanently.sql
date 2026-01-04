/*
  # حذف قيد CHECK على حقل department في platform_staff بشكل نهائي

  1. المشكلة
    - قيد CHECK يحد قيم department إلى قائمة محددة فقط
    - يمنع إضافة موظفين للأقسام الجديدة الديناميكية

  2. الحل
    - حذف القيد نهائياً
    - السماح بأي قيمة في حقل department
    - يمكن أن يكون NULL أو أي نص
*/

-- حذف قيد CHECK على حقل department
ALTER TABLE platform_staff
DROP CONSTRAINT IF EXISTS platform_staff_department_check;

-- التأكد من أن الحقل يقبل NULL
ALTER TABLE platform_staff
ALTER COLUMN department DROP NOT NULL;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN platform_staff.department IS 'كود القسم - يمكن أن يكون NULL أو أي قيمة نصية من جدول platform_departments';

-- تحديث الإحصائيات
ANALYZE platform_staff;
