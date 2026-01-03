/*
  # إصلاح سياسات RLS لجدول b2f_opportunities
  
  1. المشكلة الحالية:
     - السياسة الحالية تتطلب مستخدم authenticated + platform_admin
     - لكن المستخدمين يستخدمون النظام بدون مصادقة Supabase Auth
  
  2. الحل:
     - إضافة سياسة تسمح بالإضافة للمستخدمين anon (بدون مصادقة)
     - إضافة سياسة تسمح بالتحديث والحذف للمستخدمين anon
     - الحفاظ على سياسات authenticated للمستخدمين المصادقين
  
  3. الأمان:
     - في بيئة الإنتاج، يجب تقييد هذا بطريقة أخرى (مثل API keys)
     - حالياً نسمح بالوصول الكامل لتسهيل التطوير
*/

-- حذف السياسات الحالية للإضافة والتحديث والحذف
DROP POLICY IF EXISTS "Admins can insert opportunities" ON b2f_opportunities;
DROP POLICY IF EXISTS "Admins can update opportunities" ON b2f_opportunities;
DROP POLICY IF EXISTS "Admins can delete opportunities" ON b2f_opportunities;

-- إضافة سياسة جديدة للإضافة (anon + authenticated)
CREATE POLICY "Allow insert for anon and authenticated"
  ON b2f_opportunities
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- إضافة سياسة جديدة للتحديث (anon + authenticated)
CREATE POLICY "Allow update for anon and authenticated"
  ON b2f_opportunities
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- إضافة سياسة جديدة للحذف (anon + authenticated)
CREATE POLICY "Allow delete for anon and authenticated"
  ON b2f_opportunities
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- إضافة سياسة للمشاهدة للمصادقين (عرض كل الفرص)
DROP POLICY IF EXISTS "Admins can view all opportunities" ON b2f_opportunities;
CREATE POLICY "Allow view all for anon and authenticated"
  ON b2f_opportunities
  FOR SELECT
  TO anon, authenticated
  USING (true);
