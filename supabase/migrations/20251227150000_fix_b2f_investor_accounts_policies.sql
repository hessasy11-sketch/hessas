/*
  # إصلاح سياسات RLS لجدول b2f_investor_accounts

  1. المشكلة:
    - السياسة الحالية تسمح فقط لـ anon بالإدراج
    - لكن بعد signUp، المستخدم يصبح authenticated
    - لذا فشل الإدراج بسبب RLS

  2. الحل:
    - إضافة سياسة للمستخدمين المصادقين للإدراج
    - السماح بإدراج حساب واحد فقط لكل مستخدم
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Allow anon to insert investor accounts" ON b2f_investor_accounts;

-- إضافة سياسة جديدة للمستخدمين المصادقين
CREATE POLICY "Allow authenticated users to insert their account"
  ON b2f_investor_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- إضافة سياسة للمستخدمين غير المصادقين (للحجز السريع)
CREATE POLICY "Allow anon to insert investor accounts"
  ON b2f_investor_accounts
  FOR INSERT
  TO anon
  WITH CHECK (true);
