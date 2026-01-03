/*
  # إنشاء نظام المحفظة الزراعية والعمليات المالية

  1. الجداول الجديدة
    - `wallets` - محفظة كل مستخدم
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `balance` (decimal) - الرصيد الحالي
      - `total_earnings` (decimal) - إجمالي الأرباح
      - `pending_commissions` (decimal) - العمولات المعلقة
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `transactions` - سجل العمليات المالية
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `type` (text) - نوع العملية: deposit, withdrawal, commission, refund
      - `amount` (decimal) - المبلغ
      - `status` (text) - حالة العملية: pending, completed, failed
      - `description` (text) - وصف العملية
      - `reference_id` (text) - رقم مرجعي للعملية
      - `created_at` (timestamptz)

    - `commissions` - العمولات المستحقة
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `auction_id` (uuid, foreign key to auctions)
      - `amount` (decimal) - قيمة العمولة
      - `percentage` (decimal) - نسبة العمولة (1%)
      - `status` (text) - حالة السداد: pending, paid
      - `paid_at` (timestamptz) - تاريخ السداد
      - `created_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - المستخدمون يمكنهم فقط رؤية بياناتهم المالية الخاصة
    - سياسات للقراءة والتحديث والإدراج
*/

-- إنشاء جدول المحفظة
CREATE TABLE IF NOT EXISTS wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance decimal(10,2) DEFAULT 0.00 NOT NULL,
  total_earnings decimal(10,2) DEFAULT 0.00 NOT NULL,
  pending_commissions decimal(10,2) DEFAULT 0.00 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- إنشاء جدول العمليات المالية
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'commission', 'refund')),
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'completed' NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  description text NOT NULL,
  reference_id text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- إنشاء جدول العمولات
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  auction_id uuid REFERENCES auctions(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  percentage decimal(5,2) DEFAULT 1.00 NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- تفعيل RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- سياسات المحفظة
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات العمليات المالية
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسات العمولات
CREATE POLICY "Users can view own commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على جدول المحفظة
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_updated_at();

-- إنشاء دالة لإنشاء محفظة تلقائياً عند إنشاء مستخدم جديد
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تطبيق الدالة على جدول المستخدمين
DROP TRIGGER IF EXISTS create_wallet_on_signup ON auth.users;
CREATE TRIGGER create_wallet_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
