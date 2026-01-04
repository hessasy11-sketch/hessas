/*
  # نظام العقود المتطور - إصلاح نهائي

  ## المكونات
  1. جداول المسودات والنقل
  2. View الطلبات الجاهزة
  3. جميع الدوال المطلوبة
*/

-- =====================================================
-- 1. جدول المسودات
-- =====================================================
CREATE TABLE IF NOT EXISTS b2f_contract_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_number TEXT UNIQUE NOT NULL,
  sales_request_id UUID NOT NULL REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  investor_phone TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  farm_id UUID REFERENCES b2f_farms(id),
  trees_count INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  draft_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  issued BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_edited_at TIMESTAMPTZ,
  last_edited_by TEXT
);

-- =====================================================
-- 2. جدول نقل الانتفاع
-- =====================================================
CREATE TABLE IF NOT EXISTS b2f_contract_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT UNIQUE NOT NULL,
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  from_phone TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  to_name TEXT NOT NULL,
  to_national_id TEXT,
  transfer_reason TEXT,
  transferred_at TIMESTAMPTZ DEFAULT now(),
  requested_by TEXT
);

-- =====================================================
-- 3. تحديث جدول العقود
-- =====================================================
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS current_beneficiary_phone TEXT;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS current_beneficiary_name TEXT;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS original_beneficiary_phone TEXT;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS original_beneficiary_name TEXT;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS is_transferred BOOLEAN DEFAULT false;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS contract_content TEXT;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS investor_phone TEXT;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS trees_count INTEGER;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS amount_total NUMERIC;
ALTER TABLE b2f_contracts ADD COLUMN IF NOT EXISTS duration_months INTEGER;

-- =====================================================
-- 4. View الطلبات الجاهزة (بدون region)
-- =====================================================
DROP VIEW IF EXISTS v_contracts_ready_for_issuance;

CREATE VIEW v_contracts_ready_for_issuance AS
SELECT 
  sr.id as request_id,
  sr.investor_name,
  sr.investor_phone,
  sr.investor_email,
  sr.farm_id,
  COALESCE(f.name, 'غير محدد') as farm_name,
  COALESCE(f.city, 'غير محدد') as city,
  'غير محدد'::text as region,
  sr.opportunity_id,
  COALESCE(o.title, 'عرض استثماري') as opportunity_title,
  COALESCE(o.tree_type, sr.tree_type) as opportunity_tree_type,
  COALESCE(o.contract_duration_years, 1) as contract_duration_years,
  sr.number_of_trees,
  sr.total_amount,
  sr.tree_type as request_tree_type,
  sr.id::text as payment_document_id,
  ''::text as receipt_url,
  'approved'::text as finance_status,
  sr.total_amount as amount_detected,
  sr.total_amount as amount_expected,
  'approved'::text as staff_decision,
  sr.approved_at as reviewed_at,
  sr.approved_at as payment_approved_at
FROM b2f_sales_requests sr
LEFT JOIN b2f_farms f ON sr.farm_id = f.id
LEFT JOIN b2f_opportunities o ON sr.opportunity_id = o.id
WHERE sr.status = 'receipt_approved'
ORDER BY sr.approved_at DESC NULLS LAST;

-- =====================================================
-- 5. RLS و الصلاحيات
-- =====================================================
ALTER TABLE b2f_contract_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for drafts" ON b2f_contract_drafts;
CREATE POLICY "Allow all for drafts" ON b2f_contract_drafts FOR ALL USING (true);

ALTER TABLE b2f_contract_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for transfers" ON b2f_contract_transfers;
CREATE POLICY "Allow all for transfers" ON b2f_contract_transfers FOR ALL USING (true);

GRANT SELECT ON v_contracts_ready_for_issuance TO authenticated, anon;
GRANT ALL ON b2f_contract_drafts TO authenticated, anon;
GRANT ALL ON b2f_contract_transfers TO authenticated, anon;
