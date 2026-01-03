/*
  # نظام المصاريف التشغيلية (Operation Fees System)

  1. جداول جديدة:
    - `season_operation_fees` - رسوم التشغيل لكل موسم
      - `id` (uuid, primary key)
      - `season_id` (uuid, foreign key → farm_seasons)
      - `fee_amount` (decimal) - قيمة الرسوم
      - `due_date` (date) - تاريخ الاستحقاق
      - `status` (text) - حالة الرسوم العامة
      - `description` (text) - وصف الرسوم
      - `created_at`, `updated_at`

    - `investor_operation_fees` - رسوم كل مستثمر
      - `id` (uuid, primary key)
      - `season_fee_id` (uuid, foreign key → season_operation_fees)
      - `request_id` (uuid, foreign key → b2f_investment_requests)
      - `investor_phone` (text) - رقم المستثمر
      - `investor_name` (text) - اسم المستثمر
      - `fee_amount` (decimal) - قيمة الرسوم
      - `due_date` (date) - تاريخ الاستحقاق
      - `status` (text) - not_sent, pending_payment, under_review, paid, late
      - `receipt_url` (text) - رابط الإيصال المرفوع
      - `ai_verified_amount` (decimal) - المبلغ المتحقق منه بالذكاء الصناعي
      - `ai_verification_status` (text) - حالة التحقق
      - `paid_at` (timestamptz) - تاريخ السداد
      - `created_at`, `updated_at`

  2. تعديلات:
    - إضافة `operational_status` إلى `farm_seasons`
      - القيم: waiting_for_fees, active, completed

  3. التأمين:
    - تفعيل RLS على الجداول الجديدة
    - سياسات للإدارة والمستثمرين

  4. Functions:
    - `distribute_fees_to_investors()` - توزيع الرسوم على المستثمرين
    - `check_all_fees_paid()` - التحقق من سداد جميع الرسوم
    - `update_season_status_on_payment()` - تحديث حالة الموسم عند السداد
*/

-- جدول رسوم التشغيل للموسم
CREATE TABLE IF NOT EXISTS season_operation_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES farm_seasons(id) ON DELETE CASCADE NOT NULL,
  fee_amount decimal(10,2) NOT NULL CHECK (fee_amount >= 0),
  due_date date NOT NULL,
  status text DEFAULT 'not_sent' CHECK (status IN ('not_sent', 'pending_payment', 'partially_paid', 'fully_paid', 'overdue')),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(season_id)
);

-- جدول رسوم كل مستثمر
CREATE TABLE IF NOT EXISTS investor_operation_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_fee_id uuid REFERENCES season_operation_fees(id) ON DELETE CASCADE NOT NULL,
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE NOT NULL,
  investor_phone text NOT NULL,
  investor_name text NOT NULL,
  fee_amount decimal(10,2) NOT NULL CHECK (fee_amount >= 0),
  due_date date NOT NULL,
  status text DEFAULT 'not_sent' CHECK (status IN ('not_sent', 'pending_payment', 'under_review', 'paid', 'late')),
  receipt_url text,
  ai_verified_amount decimal(10,2),
  ai_verification_status text CHECK (ai_verification_status IN ('pending', 'verified', 'mismatch', 'failed')),
  ai_verification_notes text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(request_id)
);

-- إضافة حقل حالة التشغيل للموسم
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farm_seasons' AND column_name = 'operational_status'
  ) THEN
    ALTER TABLE farm_seasons
    ADD COLUMN operational_status text DEFAULT 'pending'
    CHECK (operational_status IN ('pending', 'waiting_for_fees', 'active', 'completed'));
  END IF;
END $$;

-- RLS Policies
ALTER TABLE season_operation_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_operation_fees ENABLE ROW LEVEL SECURITY;

-- السياسات للإدارة - قراءة وكتابة كاملة
CREATE POLICY "Authenticated users can read season fees"
  ON season_operation_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert season fees"
  ON season_operation_fees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update season fees"
  ON season_operation_fees FOR UPDATE
  TO authenticated
  USING (true);

-- سياسات رسوم المستثمرين
CREATE POLICY "Authenticated users can read investor fees"
  ON investor_operation_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can read own fees by phone"
  ON investor_operation_fees FOR SELECT
  TO anon
  USING (investor_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Authenticated users can insert investor fees"
  ON investor_operation_fees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update investor fees"
  ON investor_operation_fees FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can update own fees receipt"
  ON investor_operation_fees FOR UPDATE
  TO anon
  USING (investor_phone = current_setting('request.jwt.claims', true)::json->>'phone')
  WITH CHECK (investor_phone = current_setting('request.jwt.claims', true)::json->>'phone');

-- دالة توزيع الرسوم على المستثمرين
CREATE OR REPLACE FUNCTION distribute_fees_to_investors(
  p_season_fee_id uuid,
  p_season_id uuid,
  p_fee_amount decimal,
  p_due_date date
)
RETURNS void AS $$
BEGIN
  DELETE FROM investor_operation_fees
  WHERE season_fee_id = p_season_fee_id;

  INSERT INTO investor_operation_fees (
    season_fee_id,
    request_id,
    investor_phone,
    investor_name,
    fee_amount,
    due_date,
    status
  )
  SELECT
    p_season_fee_id,
    r.id,
    r.phone,
    r.full_name,
    p_fee_amount,
    p_due_date,
    'pending_payment'
  FROM b2f_investment_requests r
  WHERE r.season_id = p_season_id
    AND r.status = 'transferred_to_operations';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة التحقق من سداد جميع الرسوم
CREATE OR REPLACE FUNCTION check_all_fees_paid(p_season_fee_id uuid)
RETURNS boolean AS $$
DECLARE
  v_total_count integer;
  v_paid_count integer;
BEGIN
  SELECT COUNT(*) INTO v_total_count
  FROM investor_operation_fees
  WHERE season_fee_id = p_season_fee_id;

  SELECT COUNT(*) INTO v_paid_count
  FROM investor_operation_fees
  WHERE season_fee_id = p_season_fee_id
    AND status = 'paid';

  RETURN (v_total_count > 0 AND v_total_count = v_paid_count);
END;
$$ LANGUAGE plpgsql;

-- دالة تحديث حالة الموسم عند السداد
CREATE OR REPLACE FUNCTION update_season_status_on_payment()
RETURNS trigger AS $$
DECLARE
  v_season_id uuid;
  v_all_paid boolean;
BEGIN
  SELECT s.season_id INTO v_season_id
  FROM season_operation_fees s
  WHERE s.id = NEW.season_fee_id;

  v_all_paid := check_all_fees_paid(NEW.season_fee_id);

  IF v_all_paid THEN
    UPDATE farm_seasons
    SET operational_status = 'active'
    WHERE id = v_season_id;

    UPDATE season_operation_fees
    SET status = 'fully_paid',
        updated_at = now()
    WHERE id = NEW.season_fee_id;
  ELSE
    UPDATE season_operation_fees
    SET status = 'partially_paid',
        updated_at = now()
    WHERE id = NEW.season_fee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger عند تحديث حالة رسوم المستثمر إلى paid
CREATE TRIGGER trigger_update_season_on_fee_payment
  AFTER UPDATE ON investor_operation_fees
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION update_season_status_on_payment();

-- إنشاء bucket لإيصالات رسوم التشغيل
INSERT INTO storage.buckets (id, name, public)
VALUES ('operation-fee-receipts', 'operation-fee-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات storage
CREATE POLICY "Anyone can view operation fee receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'operation-fee-receipts');

CREATE POLICY "Authenticated users can upload operation fee receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'operation-fee-receipts');

CREATE POLICY "Anon can upload operation fee receipts"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'operation-fee-receipts');

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_season_operation_fees_season_id ON season_operation_fees(season_id);
CREATE INDEX IF NOT EXISTS idx_investor_operation_fees_season_fee_id ON investor_operation_fees(season_fee_id);
CREATE INDEX IF NOT EXISTS idx_investor_operation_fees_request_id ON investor_operation_fees(request_id);
CREATE INDEX IF NOT EXISTS idx_investor_operation_fees_phone ON investor_operation_fees(investor_phone);
CREATE INDEX IF NOT EXISTS idx_investor_operation_fees_status ON investor_operation_fees(status);
