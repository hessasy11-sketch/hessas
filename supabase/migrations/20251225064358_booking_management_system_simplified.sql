/*
  # نظام إدارة الحجوزات B2F - نسخة مبسطة

  1. تحديث جدول tree_rental_reservations
  2. إنشاء جداول timeline و receipts
  3. RLS policies مبسطة
  4. Storage buckets
  5. Triggers
*/

-- تحديث البيانات الموجودة
UPDATE tree_rental_reservations SET status = 'pending_review' WHERE status = 'pending';
UPDATE tree_rental_reservations SET status = 'active' WHERE status = 'confirmed';
UPDATE tree_rental_reservations SET status = 'finished' WHERE status = 'completed';

-- إضافة constraint جديد
ALTER TABLE tree_rental_reservations
  ADD CONSTRAINT tree_rental_reservations_status_check
  CHECK (status IN (
    'pending_review',
    'waiting_payment',
    'receipt_under_review',
    'active',
    'finished',
    'cancelled'
  ));

-- إضافة الحقول الجديدة
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS receipt_uploaded_at timestamptz;
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS contract_url text;
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS contract_issued_at timestamptz;
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT false;
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES profiles(id);
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;
ALTER TABLE tree_rental_reservations ADD COLUMN IF NOT EXISTS admin_notes text;

-- جدول timeline
CREATE TABLE IF NOT EXISTS booking_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES tree_rental_reservations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  old_status text,
  new_status text,
  performed_by uuid REFERENCES profiles(id),
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- جدول الإيصالات
CREATE TABLE IF NOT EXISTS booking_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES tree_rental_reservations(id) ON DELETE CASCADE,
  receipt_url text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now(),
  ai_verification_result jsonb,
  verification_status text DEFAULT 'pending',
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies

ALTER TABLE booking_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view timeline" ON booking_timeline;
CREATE POLICY "Anyone authenticated can view timeline"
  ON booking_timeline FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can insert timeline" ON booking_timeline;
CREATE POLICY "Anyone authenticated can insert timeline"
  ON booking_timeline FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER TABLE booking_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view receipts" ON booking_receipts;
CREATE POLICY "Anyone authenticated can view receipts"
  ON booking_receipts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can upload receipts" ON booking_receipts;
CREATE POLICY "Anyone authenticated can upload receipts"
  ON booking_receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone authenticated can update receipts" ON booking_receipts;
CREATE POLICY "Anyone authenticated can update receipts"
  ON booking_receipts FOR UPDATE
  TO authenticated
  USING (true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-receipts', 'booking-receipts', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-contracts', 'booking-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Trigger function
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO booking_timeline (
      booking_id,
      event_type,
      old_status,
      new_status,
      notes
    ) VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      'تم تغيير حالة الحجز'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS booking_status_change_trigger ON tree_rental_reservations;
CREATE TRIGGER booking_status_change_trigger
  AFTER UPDATE ON tree_rental_reservations
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_status_change();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_timeline_booking_id ON booking_timeline(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_timeline_created_at ON booking_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_receipts_booking_id ON booking_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_receipts_verification_status ON booking_receipts(verification_status);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON tree_rental_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_verified ON tree_rental_reservations(payment_verified);
