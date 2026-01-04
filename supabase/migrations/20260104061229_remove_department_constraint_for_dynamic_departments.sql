/*
  # إزالة قيد القسم الثابت للسماح بأقسام ديناميكية

  1. Changes
    - إزالة قيد CHECK على حقل department
    - جعل الحقل nullable مع قيمة افتراضية
    - هذا يسمح بإنشاء أقسام ديناميكية غير محدودة
*/

-- إزالة قيد CHECK القديم
ALTER TABLE platform_staff 
DROP CONSTRAINT IF EXISTS platform_staff_department_check;

-- جعل الحقل nullable مع قيمة افتراضية
ALTER TABLE platform_staff 
ALTER COLUMN department DROP NOT NULL;

ALTER TABLE platform_staff 
ALTER COLUMN department SET DEFAULT 'HQ';
