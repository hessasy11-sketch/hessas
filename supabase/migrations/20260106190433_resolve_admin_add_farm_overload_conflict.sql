/*
  # حل تضارب Function Overloading في admin_add_farm
  
  ## المشكلة
  يوجد نسختان من دالة admin_add_farm:
  1. النسخة بـ 9 معاملات (بدون farm_manager, investment_manager)
  2. النسخة بـ 11 معاملات (مع farm_manager, investment_manager)
  
  عند استدعاء الدالة بـ 9 معاملات، PostgREST لا يستطيع تحديد أي نسخة يستخدم.
  
  ## الحل
  - حذف النسخة الأولى (9 معاملات)
  - الإبقاء على النسخة الثانية (11 معاملات) لأنها تحتوي على DEFAULT NULL
  - هذا سيجعل الدالة تعمل مع أو بدون المعاملات الإضافية
*/

-- حذف النسخة الأولى بدقة (9 معاملات فقط)
DROP FUNCTION IF EXISTS admin_add_farm(
  uuid, text, text, text, integer, text, text, numeric, text
);

-- التأكد من أن النسخة الثانية موجودة وتعمل
-- (هذه النسخة موجودة بالفعل، نحن فقط نتأكد منها)

COMMENT ON FUNCTION admin_add_farm(
  uuid, text, text, text, integer, text, text, numeric, text, uuid, uuid
) IS 'دالة موحدة لإضافة مزرعة جديدة - تدعم جميع الحقول مع معاملات اختيارية';
