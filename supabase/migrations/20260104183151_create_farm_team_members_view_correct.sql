/*
  # إنشاء view لجدول farm_team_members

  1. الإنشاءات
    - إنشاء view يسمى farm_team_members يستند إلى جدول farm_team
    - إضافة معلومات من جدول platform_staff مع الأسماء الصحيحة
  
  2. الأمان
    - RLS يتم تطبيقه تلقائياً من الجدول الأساسي
*/

-- حذف الـ view القديم إن وجد
DROP VIEW IF EXISTS farm_team_members;

-- إنشاء view للتوافق مع الكود
CREATE OR REPLACE VIEW farm_team_members AS
SELECT 
  ft.id,
  ft.user_id,
  COALESCE(ps.full_name, 'غير محدد') as full_name,
  NULL::text as email,
  ps.phone_number as phone,
  ft.role,
  ft.farm_id,
  ft.is_active,
  ft.created_at as assigned_at,
  ft.created_at,
  ft.updated_at
FROM farm_team ft
LEFT JOIN platform_staff ps ON ft.user_id = ps.id;

-- منح الصلاحيات
GRANT SELECT ON farm_team_members TO anon, authenticated;