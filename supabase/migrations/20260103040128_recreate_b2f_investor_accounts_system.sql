/*
  # إعادة إنشاء نظام حسابات المستثمرين B2F - إصلاح نهائي

  1. الجداول الجديدة
    - `b2f_investor_accounts`: جدول حسابات المستثمرين
      - `id`: معرف فريد
      - `user_id`: ربط مع جدول auth.users
      - `contact_name`: اسم المستثمر
      - `contact_phone`: رقم الجوال
      - `contact_email`: البريد الإلكتروني (اختياري)
      - `pin_code`: رمز PIN (اختياري)
      - `is_profile_complete`: حالة اكتمال البيانات
      - `created_at`: تاريخ الإنشاء
      - `updated_at`: تاريخ التحديث

  2. الأمان
    - RLS مفعّل
    - المستخدمون المصادقون يمكنهم إدارة حساباتهم
    - الزوار يمكنهم القراءة للتحقق من الأرقام
*/

-- حذف الجدول إذا كان موجوداً
DROP TABLE IF EXISTS b2f_investor_accounts CASCADE;

-- إنشاء الجدول
CREATE TABLE b2f_investor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  contact_name text NOT NULL,
  contact_phone text NOT NULL UNIQUE,
  contact_email text,
  pin_code text,
  is_profile_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_investor_accounts ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Authenticated users can create account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Authenticated users can view own account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Public can read accounts" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Authenticated users can update own account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Service role full access" ON b2f_investor_accounts;

-- سياسة INSERT للمستخدمين المصادقين
CREATE POLICY "Authenticated users can create account"
  ON b2f_investor_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE user_id = auth.uid()
    )
  );

-- سياسة SELECT للمستخدمين المصادقين
CREATE POLICY "Authenticated users can view own account"
  ON b2f_investor_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسة SELECT للزوار (للتحقق من رقم الجوال)
CREATE POLICY "Public can read accounts"
  ON b2f_investor_accounts
  FOR SELECT
  TO anon
  USING (true);

-- سياسة UPDATE للمستخدمين المصادقين
CREATE POLICY "Authenticated users can update own account"
  ON b2f_investor_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- سياسة service_role للوصول الكامل
CREATE POLICY "Service role full access"
  ON b2f_investor_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_user_id ON b2f_investor_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_phone ON b2f_investor_accounts(contact_phone);
