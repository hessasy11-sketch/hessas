/*
  # المرحلة 1: تجهيز قاعدة البيانات للنظام المالي المتطور

  ## الهدف:
  تهيئة الجداول والحقول التي سيُبنى عليها نظام الإدارة المالية الجديد

  ## التغييرات:

  ### 1. إضافة/تحسين حقول الإيصالات في b2f_payment_documents
    - التأكد من وجود جميع الحقول المطلوبة
    - إضافة حقل finance_status منفصل
    - إضافة rejection_reason

  ### 2. إنشاء جدول محفظة المزارع (b2f_farm_wallets)
    - يتتبع الأموال المجموعة لكل مزرعة/عرض استثماري
    - يحسب النسبة المكتملة
    - يحدد حالة المحفظة (red/green)

  ### 3. إنشاء جدول محفظة القسم (b2f_section_wallet)
    - يتتبع إجمالي الأموال المجموعة في القسم
    - إحصائيات شاملة

  ### 4. Triggers والدوال المساعدة
    - تحديث المحافظ تلقائياً عند اعتماد الإيصالات
*/

-- ==================================================
-- المرحلة 1: تحسين جدول الإيصالات
-- ==================================================

DO $$
BEGIN
  -- إضافة finance_status (حالة مالية منفصلة عن ai_decision)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_payment_documents'
    AND column_name = 'finance_status'
  ) THEN
    ALTER TABLE b2f_payment_documents
    ADD COLUMN finance_status text DEFAULT 'pending_review'
    CHECK (finance_status IN (
      'pending_review',       -- في انتظار المراجعة
      'approved_for_contract', -- معتمد وجاهز للعقد
      'rejected_final'        -- مرفوض نهائياً
    ));
  END IF;

  -- إضافة rejection_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_payment_documents'
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE b2f_payment_documents
    ADD COLUMN rejection_reason text;
  END IF;

  -- إضافة investor_id (إن لم يكن موجوداً)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_payment_documents'
    AND column_name = 'investor_id'
  ) THEN
    ALTER TABLE b2f_payment_documents
    ADD COLUMN investor_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE SET NULL;
  END IF;

  -- إضافة farm_id (إن لم يكن موجوداً)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_payment_documents'
    AND column_name = 'farm_id'
  ) THEN
    ALTER TABLE b2f_payment_documents
    ADD COLUMN farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE;
  END IF;

  -- إضافة opportunity_id (إن لم يكن موجوداً)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_payment_documents'
    AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE b2f_payment_documents
    ADD COLUMN opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE CASCADE;
  END IF;
END $$;

-- تحديث البيانات الموجودة: ربط investor_id و farm_id من sales_request
UPDATE b2f_payment_documents pd
SET
  farm_id = sr.farm_id,
  opportunity_id = sr.opportunity_id,
  investor_id = sr.investor_account_id
FROM b2f_sales_requests sr
WHERE pd.sales_request_id = sr.id
  AND (pd.farm_id IS NULL OR pd.investor_id IS NULL);

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_payment_docs_finance_status
  ON b2f_payment_documents(finance_status);

CREATE INDEX IF NOT EXISTS idx_payment_docs_farm
  ON b2f_payment_documents(farm_id);

CREATE INDEX IF NOT EXISTS idx_payment_docs_investor
  ON b2f_payment_documents(investor_id);

-- ==================================================
-- المرحلة 2: إنشاء جدول محفظة المزارع
-- ==================================================

CREATE TABLE IF NOT EXISTS b2f_farm_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- معرّف المزرعة والعرض
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE CASCADE,

  -- المبالغ المالية
  target_amount numeric(12,2) NOT NULL DEFAULT 0,  -- القيمة المستهدفة
  collected_amount numeric(12,2) NOT NULL DEFAULT 0,  -- المبلغ المجموع فعلياً
  pending_amount numeric(12,2) NOT NULL DEFAULT 0,  -- مبالغ قيد المراجعة

  -- النسب المئوية
  completion_percentage numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN target_amount > 0 THEN ROUND((collected_amount / target_amount) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- حالة المحفظة
  status text NOT NULL DEFAULT 'red' CHECK (status IN ('red', 'green')),

  -- مرحلة المحفظة
  wallet_phase text NOT NULL DEFAULT 'fundraising' CHECK (wallet_phase IN (
    'fundraising',  -- مرحلة جمع الأموال
    'operating',    -- مرحلة التشغيل
    'completed',    -- مكتمل
    'paused'        -- متوقف مؤقتاً
  )),

  -- إحصائيات
  total_investors integer DEFAULT 0,  -- عدد المستثمرين
  total_receipts integer DEFAULT 0,   -- عدد الإيصالات المعتمدة

  -- تواريخ
  first_payment_at timestamptz,
  last_payment_at timestamptz,
  fundraising_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- فريد لكل مزرعة
  UNIQUE(farm_id, opportunity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farm_wallets_farm
  ON b2f_farm_wallets(farm_id);

CREATE INDEX IF NOT EXISTS idx_farm_wallets_opportunity
  ON b2f_farm_wallets(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_farm_wallets_status
  ON b2f_farm_wallets(status);

CREATE INDEX IF NOT EXISTS idx_farm_wallets_phase
  ON b2f_farm_wallets(wallet_phase);

-- RLS
ALTER TABLE b2f_farm_wallets ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - الجميع يمكنهم القراءة
CREATE POLICY "Anyone can view farm wallets"
  ON b2f_farm_wallets FOR SELECT
  TO anon, authenticated
  USING (true);

-- سياسة التحديث - الإدارة فقط
CREATE POLICY "Admins can update farm wallets"
  ON b2f_farm_wallets FOR UPDATE
  TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

-- سياسة الإدراج - الإدارة فقط
CREATE POLICY "Admins can insert farm wallets"
  ON b2f_farm_wallets FOR INSERT
  TO authenticated
  WITH CHECK (is_b2f_admin(auth.uid()));

-- ==================================================
-- المرحلة 3: إنشاء جدول محفظة القسم
-- ==================================================

CREATE TABLE IF NOT EXISTS b2f_section_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- اسم القسم
  section_name text NOT NULL DEFAULT 'استثمار أشجار المزارع',

  -- الإحصائيات المالية
  total_collected_amount numeric(12,2) NOT NULL DEFAULT 0,  -- إجمالي المبالغ المجموعة
  total_target_amount numeric(12,2) NOT NULL DEFAULT 0,     -- إجمالي المستهدف (اختياري)
  total_pending_amount numeric(12,2) NOT NULL DEFAULT 0,    -- إجمالي قيد المراجعة

  -- إحصائيات عامة
  total_farms integer DEFAULT 0,           -- عدد المزارع النشطة
  total_opportunities integer DEFAULT 0,   -- عدد العروض النشطة
  total_investors integer DEFAULT 0,       -- عدد المستثمرين
  total_receipts integer DEFAULT 0,        -- عدد الإيصالات المعتمدة
  total_contracts integer DEFAULT 0,       -- عدد العقود الصادرة

  -- النسبة المئوية الكلية
  overall_completion_percentage numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_target_amount > 0 THEN ROUND((total_collected_amount / total_target_amount) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- تواريخ
  first_transaction_at timestamptz,
  last_transaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- سجل واحد فقط
  UNIQUE(section_name)
);

-- RLS
ALTER TABLE b2f_section_wallet ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - الجميع يمكنهم القراءة
CREATE POLICY "Anyone can view section wallet"
  ON b2f_section_wallet FOR SELECT
  TO anon, authenticated
  USING (true);

-- سياسة التحديث - الإدارة فقط
CREATE POLICY "Admins can update section wallet"
  ON b2f_section_wallet FOR UPDATE
  TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

-- إنشاء سجل المحفظة الافتراضي
INSERT INTO b2f_section_wallet (section_name)
VALUES ('استثمار أشجار المزارع')
ON CONFLICT (section_name) DO NOTHING;

-- ==================================================
-- المرحلة 4: دالة تهيئة محفظة المزرعة
-- ==================================================

CREATE OR REPLACE FUNCTION initialize_farm_wallet(
  p_farm_id uuid,
  p_opportunity_id uuid,
  p_target_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  -- إنشاء أو تحديث محفظة المزرعة
  INSERT INTO b2f_farm_wallets (
    farm_id,
    opportunity_id,
    target_amount,
    wallet_phase
  )
  VALUES (
    p_farm_id,
    p_opportunity_id,
    p_target_amount,
    'fundraising'
  )
  ON CONFLICT (farm_id, opportunity_id) DO UPDATE
  SET target_amount = EXCLUDED.target_amount
  RETURNING id INTO v_wallet_id;

  RETURN v_wallet_id;
END;
$$;

-- ==================================================
-- المرحلة 5: دالة تحديث محفظة المزرعة
-- ==================================================

CREATE OR REPLACE FUNCTION update_farm_wallet_on_payment_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_opportunity_id uuid;
  v_amount numeric;
  v_wallet_exists boolean;
BEGIN
  -- فقط عند اعتماد الدفع
  IF NEW.finance_status = 'approved_for_contract' AND
     (OLD.finance_status IS NULL OR OLD.finance_status != 'approved_for_contract') THEN

    -- الحصول على معلومات المزرعة والمبلغ
    v_farm_id := NEW.farm_id;
    v_opportunity_id := NEW.opportunity_id;
    v_amount := COALESCE(NEW.amount_detected, NEW.amount_expected);

    -- التحقق من وجود محفظة
    SELECT EXISTS (
      SELECT 1 FROM b2f_farm_wallets
      WHERE farm_id = v_farm_id
      AND opportunity_id = v_opportunity_id
    ) INTO v_wallet_exists;

    -- إنشاء المحفظة إن لم تكن موجودة
    IF NOT v_wallet_exists THEN
      PERFORM initialize_farm_wallet(v_farm_id, v_opportunity_id);
    END IF;

    -- تحديث المحفظة
    UPDATE b2f_farm_wallets
    SET
      collected_amount = collected_amount + v_amount,
      total_receipts = total_receipts + 1,
      last_payment_at = now(),
      updated_at = now(),
      first_payment_at = COALESCE(first_payment_at, now()),
      -- تحديث الحالة إلى green إذا وصلنا للهدف
      status = CASE
        WHEN (collected_amount + v_amount) >= target_amount THEN 'green'
        ELSE 'red'
      END,
      -- تحديث المرحلة إلى operating إذا اكتمل التمويل
      wallet_phase = CASE
        WHEN (collected_amount + v_amount) >= target_amount AND wallet_phase = 'fundraising'
        THEN 'operating'
        ELSE wallet_phase
      END,
      fundraising_completed_at = CASE
        WHEN (collected_amount + v_amount) >= target_amount AND fundraising_completed_at IS NULL
        THEN now()
        ELSE fundraising_completed_at
      END
    WHERE farm_id = v_farm_id
      AND opportunity_id = v_opportunity_id;

    -- تحديث عدد المستثمرين الفريدين
    UPDATE b2f_farm_wallets fw
    SET total_investors = (
      SELECT COUNT(DISTINCT investor_id)
      FROM b2f_payment_documents
      WHERE farm_id = fw.farm_id
        AND opportunity_id = fw.opportunity_id
        AND finance_status = 'approved_for_contract'
    )
    WHERE fw.farm_id = v_farm_id
      AND fw.opportunity_id = v_opportunity_id;

  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS trigger_update_farm_wallet ON b2f_payment_documents;

CREATE TRIGGER trigger_update_farm_wallet
  AFTER INSERT OR UPDATE ON b2f_payment_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_wallet_on_payment_approval();

-- ==================================================
-- المرحلة 6: دالة تحديث محفظة القسم
-- ==================================================

CREATE OR REPLACE FUNCTION update_section_wallet_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE b2f_section_wallet
  SET
    -- إجمالي المبالغ المجموعة
    total_collected_amount = (
      SELECT COALESCE(SUM(collected_amount), 0)
      FROM b2f_farm_wallets
    ),

    -- إجمالي المستهدف
    total_target_amount = (
      SELECT COALESCE(SUM(target_amount), 0)
      FROM b2f_farm_wallets
    ),

    -- إجمالي قيد المراجعة
    total_pending_amount = (
      SELECT COALESCE(SUM(pending_amount), 0)
      FROM b2f_farm_wallets
    ),

    -- عدد المزارع
    total_farms = (
      SELECT COUNT(DISTINCT farm_id)
      FROM b2f_farm_wallets
    ),

    -- عدد العروض
    total_opportunities = (
      SELECT COUNT(DISTINCT opportunity_id)
      FROM b2f_farm_wallets
      WHERE opportunity_id IS NOT NULL
    ),

    -- عدد المستثمرين
    total_investors = (
      SELECT COUNT(DISTINCT investor_id)
      FROM b2f_payment_documents
      WHERE finance_status = 'approved_for_contract'
    ),

    -- عدد الإيصالات
    total_receipts = (
      SELECT COUNT(*)
      FROM b2f_payment_documents
      WHERE finance_status = 'approved_for_contract'
    ),

    -- عدد العقود
    total_contracts = (
      SELECT COUNT(*)
      FROM b2f_sales_requests
      WHERE contract_issued = true
    ),

    -- آخر معاملة
    last_transaction_at = now(),
    updated_at = now()
  WHERE section_name = 'استثمار أشجار المزارع';
END;
$$;

-- ==================================================
-- المرحلة 7: دالة Trigger لتحديث محفظة القسم تلقائياً
-- ==================================================

CREATE OR REPLACE FUNCTION trigger_update_section_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث إحصائيات القسم
  PERFORM update_section_wallet_stats();
  RETURN NEW;
END;
$$;

-- Trigger على محفظة المزارع
DROP TRIGGER IF EXISTS trigger_sync_section_wallet_on_farm_update ON b2f_farm_wallets;

CREATE TRIGGER trigger_sync_section_wallet_on_farm_update
  AFTER INSERT OR UPDATE ON b2f_farm_wallets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_section_wallet();

-- ==================================================
-- المرحلة 8: دالة للحصول على ملخص محفظة مزرعة
-- ==================================================

CREATE OR REPLACE FUNCTION get_farm_wallet_summary(p_farm_id uuid, p_opportunity_id uuid DEFAULT NULL)
RETURNS TABLE (
  wallet_id uuid,
  farm_name text,
  opportunity_name text,
  target_amount numeric,
  collected_amount numeric,
  pending_amount numeric,
  completion_percentage numeric,
  status text,
  wallet_phase text,
  total_investors integer,
  total_receipts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fw.id,
    f.name,
    o.title,
    fw.target_amount,
    fw.collected_amount,
    fw.pending_amount,
    fw.completion_percentage,
    fw.status,
    fw.wallet_phase,
    fw.total_investors,
    fw.total_receipts
  FROM b2f_farm_wallets fw
  LEFT JOIN b2f_farms f ON f.id = fw.farm_id
  LEFT JOIN b2f_opportunities o ON o.id = fw.opportunity_id
  WHERE fw.farm_id = p_farm_id
    AND (p_opportunity_id IS NULL OR fw.opportunity_id = p_opportunity_id);
END;
$$;

-- ==================================================
-- المرحلة 9: Trigger لتحديث updated_at
-- ==================================================

CREATE OR REPLACE FUNCTION update_farm_wallet_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_farm_wallet_timestamp ON b2f_farm_wallets;

CREATE TRIGGER trigger_update_farm_wallet_timestamp
  BEFORE UPDATE ON b2f_farm_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_wallet_timestamp();

CREATE OR REPLACE FUNCTION update_section_wallet_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_section_wallet_timestamp ON b2f_section_wallet;

CREATE TRIGGER trigger_update_section_wallet_timestamp
  BEFORE UPDATE ON b2f_section_wallet
  FOR EACH ROW
  EXECUTE FUNCTION update_section_wallet_timestamp();

-- ==================================================
-- المرحلة 10: Comments توضيحية
-- ==================================================

COMMENT ON TABLE b2f_farm_wallets IS
'محفظة مالية لكل مزرعة - تتتبع الأموال المجموعة والمستهدفة';

COMMENT ON TABLE b2f_section_wallet IS
'محفظة مالية شاملة لقسم استثمار أشجار المزارع';

COMMENT ON COLUMN b2f_payment_documents.finance_status IS
'حالة المراجعة المالية - منفصلة عن ai_decision';

COMMENT ON COLUMN b2f_farm_wallets.status IS
'red = لم يكتمل التمويل، green = اكتمل التمويل';

COMMENT ON COLUMN b2f_farm_wallets.wallet_phase IS
'fundraising = جمع الأموال، operating = التشغيل، completed = مكتمل';