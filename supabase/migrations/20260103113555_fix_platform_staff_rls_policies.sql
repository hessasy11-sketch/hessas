/*
  # إصلاح سياسات RLS لجدول platform_staff

  1. Changes:
    - إضافة سياسة للقراءة العامة (للسماح بعرض بيانات الموظفين الأساسية)
    - إصلاح سياسات الإدراج لتكون أقل تقييداً
    - الحفاظ على الأمان للعمليات الحساسة

  2. Security:
    - القراءة متاحة للجميع (لعرض معلومات الموظفين العامة)
    - الإدراج يتطلب المصادقة أو صلاحيات خاصة
    - التحديث والحذف يتطلبان صلاحيات إدارية
*/

-- حذف السياسات المتضاربة
DROP POLICY IF EXISTS "Authenticated users can insert staff" ON platform_staff;
DROP POLICY IF EXISTS "Platform admins and super admin staff can view" ON platform_staff;

-- إضافة سياسة للقراءة العامة
CREATE POLICY "Anyone can view platform staff"
  ON platform_staff
  FOR SELECT
  USING (true);

-- السماح للمستخدمين المصادقين بالإدراج (سيتم التحقق من الصلاحيات في التطبيق)
CREATE POLICY "Service role and admins can insert staff"
  ON platform_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin(auth.uid()) OR 
    is_platform_owner() OR 
    is_super_admin_staff()
  );
