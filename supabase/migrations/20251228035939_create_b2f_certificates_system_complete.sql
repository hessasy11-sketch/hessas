/*
  # نظام الشهادات الاستثمارية - نظام كامل
  
  1. جدول b2f_certificates
    - مرتبط بـ investment_reservations
    - معلومات الشهادة الكاملة
    
  2. حقول في investment_reservations
    - certificate_id
    - certificate_number
    - certificate_issued
    - certificate_issued_at
    
  3. Storage bucket للشهادات
  
  4. RLS وأمان كامل
*/

-- جدول الشهادات
CREATE TABLE IF NOT EXISTS b2f_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES investment_reservations(id) ON DELETE CASCADE,
  
  -- معلومات الشهادة
  certificate_number TEXT UNIQUE NOT NULL,
  investor_name TEXT NOT NULL,
  investor_phone TEXT NOT NULL,
  investor_id TEXT,
  
  -- معلومات الاستثمار
  farm_name TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  tree_type TEXT NOT NULL,
  tree_count INTEGER NOT NULL,
  
  -- المعلومات المالية
  total_amount DECIMAL(10,2) NOT NULL,
  contract_duration_years INTEGER NOT NULL DEFAULT 10,
  
  -- التواريخ
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  
  -- الملفات
  certificate_url TEXT,
  qr_code_data TEXT,
  
  -- الحالة
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  
  -- التوقيتات
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إضافة حقول الشهادة في investment_reservations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'certificate_id'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN certificate_id uuid REFERENCES b2f_certificates(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'certificate_number'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN certificate_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'certificate_issued'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN certificate_issued BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'certificate_issued_at'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN certificate_issued_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_b2f_certificates_reservation_id 
ON b2f_certificates(reservation_id);

CREATE INDEX IF NOT EXISTS idx_b2f_certificates_certificate_number 
ON b2f_certificates(certificate_number);

CREATE INDEX IF NOT EXISTS idx_b2f_certificates_investor_phone 
ON b2f_certificates(investor_phone);

CREATE INDEX IF NOT EXISTS idx_b2f_certificates_issued_date 
ON b2f_certificates(issued_date DESC);

CREATE INDEX IF NOT EXISTS idx_investment_reservations_certificate_id 
ON investment_reservations(certificate_id);

-- RLS
ALTER TABLE b2f_certificates ENABLE ROW LEVEL SECURITY;

-- أي شخص يمكنه قراءة الشهادات للتحقق العام
CREATE POLICY "Anyone can read certificates"
  ON b2f_certificates FOR SELECT
  USING (true);

-- المستخدمون المصادق عليهم يمكنهم إدارة الشهادات
CREATE POLICY "Authenticated users can manage certificates"
  ON b2f_certificates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function لتوليد رقم شهادة فريد
CREATE OR REPLACE FUNCTION generate_b2f_certificate_number()
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
      SELECT 1 FROM b2f_certificates 
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

DROP TRIGGER IF EXISTS update_b2f_certificates_updated_at_trigger ON b2f_certificates;
CREATE TRIGGER update_b2f_certificates_updated_at_trigger
  BEFORE UPDATE ON b2f_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_certificates_updated_at();

-- إنشاء bucket للشهادات
INSERT INTO storage.buckets (id, name, public)
VALUES ('b2f-certificates', 'b2f-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  -- السماح بقراءة الشهادات
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view certificates'
  ) THEN
    CREATE POLICY "Anyone can view certificates"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'b2f-certificates');
  END IF;

  -- السماح برفع الشهادات للمستخدمين المصادق عليهم
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload certificates'
  ) THEN
    CREATE POLICY "Authenticated users can upload certificates"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'b2f-certificates');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Comments
COMMENT ON TABLE b2f_certificates IS 'جدول الشهادات الاستثمارية لقسم B2F';
COMMENT ON COLUMN b2f_certificates.certificate_number IS 'رقم الشهادة الفريد';
COMMENT ON COLUMN b2f_certificates.qr_code_data IS 'بيانات QR Code للتحقق من الشهادة';
COMMENT ON COLUMN investment_reservations.certificate_id IS 'معرف الشهادة الصادرة';
