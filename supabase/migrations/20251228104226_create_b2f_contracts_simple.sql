/*
  # إنشاء جدول عقود B2F (مبسط)
  
  جدول لجميع العقود المُصدرة من النظام
*/

CREATE TABLE IF NOT EXISTS b2f_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- الربط مع الطلب
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  
  -- معلومات العقد
  contract_number text NOT NULL UNIQUE,
  contract_date date NOT NULL DEFAULT CURRENT_DATE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  contract_duration_years integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'terminated')),
  
  -- معلومات المستثمر
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  
  -- معلومات المزرعة والفرصة
  farm_name text NOT NULL,
  opportunity_title text NOT NULL,
  tree_type text NOT NULL,
  tree_count integer NOT NULL CHECK (tree_count > 0),
  
  -- المبالغ
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  
  -- الشروط والأحكام
  terms text,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_request_id ON b2f_contracts(request_id);
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_contract_number ON b2f_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_investor_phone ON b2f_contracts(investor_phone);
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_status ON b2f_contracts(status);
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_created_at ON b2f_contracts(created_at DESC);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_b2f_contracts_updated_at ON b2f_contracts;
CREATE TRIGGER trigger_update_b2f_contracts_updated_at
  BEFORE UPDATE ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_contracts_updated_at();

-- Function لتوليد رقم عقد فريد
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS text AS $$
DECLARE
  v_year text;
  v_random text;
  v_contract_number text;
  v_attempts integer := 0;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  LOOP
    v_random := LPAD(FLOOR(RANDOM() * 999999)::text, 6, '0');
    v_contract_number := 'CONTRACT-' || v_year || '-' || v_random;
    
    IF NOT EXISTS (SELECT 1 FROM b2f_contracts WHERE contract_number = v_contract_number) THEN
      RETURN v_contract_number;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      v_contract_number := 'CONTRACT-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text;
      RETURN v_contract_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE b2f_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all contracts"
  ON b2f_contracts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create contracts"
  ON b2f_contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON b2f_contracts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT EXECUTE ON FUNCTION generate_contract_number TO authenticated, anon;
