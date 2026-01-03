/*
  # إعادة نظام حسابات المستثمرين B2F

  1. الجدول الجديد:
    - `b2f_investor_accounts` - حسابات المستثمرين في قسم B2F
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `contact_name` (text)
      - `contact_phone` (text)
      - `pin_code` (text)
      - `is_profile_complete` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان:
    - تمكين RLS
    - السماح للمستخدمين المصادقين بإدارة حساباتهم
    - السماح للـ anon بإنشاء حسابات جديدة
*/

-- Create b2f_investor_accounts table
CREATE TABLE IF NOT EXISTS b2f_investor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  pin_code text NOT NULL,
  is_profile_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE b2f_investor_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow anon to insert investor accounts"
  ON b2f_investor_accounts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view their own account"
  ON b2f_investor_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own account"
  ON b2f_investor_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_user_id ON b2f_investor_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_phone ON b2f_investor_accounts(contact_phone);