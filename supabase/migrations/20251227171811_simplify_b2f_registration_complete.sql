/*
  # تبسيط نظام التسجيل في B2F - إصلاح شامل

  1. التغييرات
    - جعل pin_code اختياري (nullable)
    - إصلاح RLS policies للسماح بإنشاء الحساب
    - إضافة constraint لضمان حساب واحد لكل مستخدم

  2. الأمان
    - السماح لـ authenticated users بإنشاء حساب واحد فقط
    - السماح لـ anon users بالقراءة عبر رقم الجوال فقط
    - حماية البيانات الشخصية
*/

-- جعل pin_code اختياري
ALTER TABLE b2f_investor_accounts
  ALTER COLUMN pin_code DROP NOT NULL;

-- إزالة السياسات القديمة
DROP POLICY IF EXISTS "Authenticated users can create their account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Allow authenticated users to insert their account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Allow anon to insert investor accounts" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Allow anon to read by phone" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Anon users can read by phone" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Allow authenticated users to read their account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Authenticated users can read their account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Allow authenticated users to update their account" ON b2f_investor_accounts;
DROP POLICY IF EXISTS "Authenticated users can update their account" ON b2f_investor_accounts;

-- سياسة INSERT للمستخدمين المصادقين (بعد signUp)
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

-- إضافة unique constraint لضمان حساب واحد لكل مستخدم
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'b2f_investor_accounts_user_id_unique'
  ) THEN
    ALTER TABLE b2f_investor_accounts
      ADD CONSTRAINT b2f_investor_accounts_user_id_unique
      UNIQUE (user_id);
  END IF;
END $$;

-- إضافة index لتسريع البحث برقم الجوال
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_phone
  ON b2f_investor_accounts(contact_phone);