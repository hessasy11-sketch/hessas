/*
  # نظام الشهادات لقسم B2F
  
  1. جداول جديدة
    - `b2f_investment_certificates` - جدول الشهادات
  
  2. تحديثات على b2f_investment_requests
    - إضافة أعمدة جديدة لحالات الإيصال
  
  3. التخزين
    - إنشاء bucket للشهادات
  
  4. الأمان
    - RLS policies بسيطة للشهادات
*/

-- إضافة أعمدة جديدة لجدول b2f_investment_requests
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'receipt_verification_status'
  ) THEN
    ALTER TABLE b2f_investment_requests 
    ADD COLUMN receipt_verification_status TEXT DEFAULT 'pending' CHECK (receipt_verification_status IN ('pending', 'verified', 'needs_review', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'ai_verification_result'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN ai_verification_result JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'ai_verified_at'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN ai_verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'certificate_issued'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN certificate_issued BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' AND column_name = 'certificate_issued_at'
  ) THEN
    ALTER TABLE b2f_investment_requests ADD COLUMN certificate_issued_at TIMESTAMPTZ;
  END IF;
END $$;

-- جدول الشهادات
CREATE TABLE IF NOT EXISTS b2f_investment_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_request_id UUID NOT NULL REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  investor_account_id UUID NOT NULL REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  investor_name TEXT NOT NULL,
  investor_phone TEXT NOT NULL,
  farm_name TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  tree_type TEXT NOT NULL,
  tree_count INTEGER NOT NULL,
  contract_duration_years INTEGER NOT NULL DEFAULT 10,
  total_amount DECIMAL(10,2) NOT NULL,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  certificate_pdf_url TEXT,
  qr_code_data TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_certificates_investor ON b2f_investment_certificates(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_certificates_request ON b2f_investment_certificates(investment_request_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON b2f_investment_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_phone ON b2f_investment_certificates(investor_phone);

-- Enable RLS
ALTER TABLE b2f_investment_certificates ENABLE ROW LEVEL SECURITY;

-- Policies: أي شخص يمكنه قراءة الشهادات (للتحقق العام)
CREATE POLICY "Anyone can read certificates"
  ON b2f_investment_certificates
  FOR SELECT
  USING (true);

-- Policies: Service role يمكنه إدارة الشهادات
CREATE POLICY "Service role can manage certificates"
  ON b2f_investment_certificates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function لتوليد رقم شهادة فريد
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_number := 'CERT-' || 
                  EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                  LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    SELECT EXISTS(
      SELECT 1 FROM b2f_investment_certificates 
      WHERE certificate_number = new_number
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_b2f_certificates_updated_at_trigger ON b2f_investment_certificates;
CREATE TRIGGER update_b2f_certificates_updated_at_trigger
  BEFORE UPDATE ON b2f_investment_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_certificates_updated_at();

-- إنشاء bucket للشهادات
INSERT INTO storage.buckets (id, name, public)
VALUES ('b2f-certificates', 'b2f-certificates', true)
ON CONFLICT (id) DO NOTHING;
