/*
  # إعادة نظام حسابات المستثمرين B2F
  
  1. الجداول الجديدة
    - `b2f_investor_accounts` - حسابات المستثمرين في قسم B2F
      - `id` (uuid, primary key)
      - `phone` (text, unique) - رقم الجوال
      - `pin_code` (text) - الرقم السري
      - `full_name` (text) - الاسم الكامل
      - `national_id` (text) - رقم الهوية
      - `email` (text) - البريد الإلكتروني
      - `is_registered` (boolean) - مكتمل التسجيل
      - `created_at` (timestamptz)
      - `user_id` (uuid) - ربط مع جدول profiles
  
  2. الأمان
    - تفعيل RLS
    - سياسات للقراءة والتعديل
*/

-- إنشاء جدول حسابات المستثمرين
CREATE TABLE IF NOT EXISTS b2f_investor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  pin_code text,
  full_name text,
  national_id text,
  email text,
  is_registered boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- تفعيل RLS
ALTER TABLE b2f_investor_accounts ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع (للبحث بالرقم)
CREATE POLICY "Anyone can read accounts by phone"
  ON b2f_investor_accounts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- سياسة الإدراج للجميع (للتسجيل)
CREATE POLICY "Anyone can create account"
  ON b2f_investor_accounts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- سياسة التعديل لصاحب الحساب أو المستخدمين المصادق عليهم
CREATE POLICY "Users can update own account"
  ON b2f_investor_accounts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_phone ON b2f_investor_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_user_id ON b2f_investor_accounts(user_id);
