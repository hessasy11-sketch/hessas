/*
  # إصلاح سياسات RLS للتصنيفات

  1. التغييرات
    - حذف السياسة القديمة التي تسمح فقط للمستخدمين المسجلين
    - إضافة سياسة جديدة تسمح للجميع (anon + authenticated) بعرض التصنيفات
    - الاحتفاظ بسياسة الإدارة للأدمن فقط

  2. الهدف
    - السماح لأي زائر بمشاهدة التصنيفات
    - الحفاظ على أمان عمليات التعديل (admins فقط)
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Anyone can view categories" ON auction_categories;

-- إضافة سياسة جديدة تسمح للجميع بالعرض
CREATE POLICY "Public and authenticated can view categories"
  ON auction_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);
