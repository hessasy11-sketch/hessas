/*
  # استكمال تحسين جدول b2f_investment_requests
  
  ## التغييرات
  1. إضافة حقول operational الكاملة
  2. إضافة حقول contract والعقود
  3. إضافة user_id للربط مع المستخدمين
  4. إنشاء جدول operational_timeline
  5. تحديث البيانات الموجودة
*/

-- ====================================
-- 1. إضافة حقول Operational الكاملة
-- ====================================

ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS operational_phase text,
ADD COLUMN IF NOT EXISTS operational_progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS operational_notes text,
ADD COLUMN IF NOT EXISTS operational_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS next_action text,
ADD COLUMN IF NOT EXISTS next_action_date date;

-- ====================================
-- 2. إضافة حقول Contract والعقود
-- ====================================

ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS contract_id uuid,
ADD COLUMN IF NOT EXISTS contract_issued boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contract_issued_at timestamptz,
ADD COLUMN IF NOT EXISTS contract_status text,
ADD COLUMN IF NOT EXISTS needs_contract boolean DEFAULT false;

-- ====================================
-- 3. إضافة user_id للربط مع المستخدمين
-- ====================================

ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ====================================
-- 4. تحديث defaults للحقول الموجودة
-- ====================================

DO $$ 
BEGIN
  -- تحديث defaults فقط إذا لم يكن موجوداً بالفعل
  ALTER TABLE b2f_investment_requests
  ALTER COLUMN investor_name SET DEFAULT '';
  
  ALTER TABLE b2f_investment_requests
  ALTER COLUMN investor_phone SET DEFAULT '';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ====================================
-- 5. إنشاء Indexes للأداء
-- ====================================

CREATE INDEX IF NOT EXISTS idx_b2f_requests_user_id ON b2f_investment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_b2f_requests_contract_id ON b2f_investment_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_b2f_requests_contract_issued ON b2f_investment_requests(contract_issued);
CREATE INDEX IF NOT EXISTS idx_b2f_requests_operational_phase ON b2f_investment_requests(operational_phase);
CREATE INDEX IF NOT EXISTS idx_b2f_requests_next_action_date ON b2f_investment_requests(next_action_date);

-- ====================================
-- 6. إنشاء جدول Operational Timeline
-- ====================================

CREATE TABLE IF NOT EXISTS b2f_operational_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  
  from_status text,
  to_status text,
  operational_phase text,
  action_taken text NOT NULL,
  notes text,
  progress integer,
  performed_by text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2f_operational_timeline_request ON b2f_operational_timeline(request_id);
CREATE INDEX IF NOT EXISTS idx_b2f_operational_timeline_created ON b2f_operational_timeline(created_at DESC);

-- ====================================
-- 7. Enable RLS على الجدول الجديد
-- ====================================

ALTER TABLE b2f_operational_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view timeline"
  ON b2f_operational_timeline
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert timeline"
  ON b2f_operational_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ====================================
-- 8. تحديث البيانات الموجودة
-- ====================================

-- تحديث expected_amount للسجلات القديمة
UPDATE b2f_investment_requests
SET expected_amount = total_amount
WHERE expected_amount IS NULL;

-- تحديث operational status و phase و progress للسجلات الموجودة
UPDATE b2f_investment_requests
SET 
  operational_phase = CASE 
    WHEN status = 'new' THEN 'طلب جديد'
    WHEN status = 'approved' THEN 'تمت الموافقة'
    WHEN status = 'awaiting_payment' THEN 'في انتظار الدفع'
    WHEN status = 'payment_uploaded' THEN 'التحقق من الدفع'
    WHEN status IN ('payment_verified', 'approved_pending_payment') THEN 'تجهيز العقد'
    WHEN status IN ('contract_ready', 'awaiting_contract') THEN 'إصدار العقد'
    WHEN status = 'contract_issued' THEN 'إدخال في خطة الزراعة'
    WHEN status IN ('transferred_to_operations', 'active', 'contacted') THEN 'قيد التشغيل والمتابعة'
    WHEN status = 'completed' THEN 'مكتمل'
    WHEN status IN ('cancelled', 'rejected') THEN 'ملغي'
    ELSE COALESCE(operational_phase, 'طلب جديد')
  END,
  operational_progress = CASE 
    WHEN status = 'new' THEN 5
    WHEN status = 'approved' THEN 15
    WHEN status = 'awaiting_payment' THEN 20
    WHEN status = 'payment_uploaded' THEN 30
    WHEN status IN ('payment_verified', 'approved_pending_payment') THEN 45
    WHEN status IN ('contract_ready', 'awaiting_contract') THEN 55
    WHEN status = 'contract_issued' THEN 70
    WHEN status IN ('transferred_to_operations', 'active', 'contacted') THEN 85
    WHEN status = 'completed' THEN 100
    ELSE COALESCE(operational_progress, 0)
  END,
  operational_status = CASE 
    WHEN status = 'new' THEN 'not_started'
    WHEN status IN ('approved', 'awaiting_payment', 'payment_uploaded', 'payment_verified', 'approved_pending_payment', 'awaiting_contract', 'contract_ready') THEN 'preparation'
    WHEN status = 'contract_issued' THEN 'planting'
    WHEN status IN ('transferred_to_operations', 'active', 'contacted') THEN 'monitoring'
    WHEN status = 'completed' THEN 'completed'
    WHEN status IN ('cancelled', 'rejected') THEN 'cancelled'
    ELSE COALESCE(operational_status, 'not_started')
  END,
  operational_updated_at = COALESCE(operational_updated_at, now());

-- ====================================
-- 9. إنشاء Function للإحصائيات
-- ====================================

CREATE OR REPLACE FUNCTION get_b2f_requests_stats()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'new', COUNT(*) FILTER (WHERE status = 'new'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'awaiting_payment', COUNT(*) FILTER (WHERE status = 'awaiting_payment'),
    'payment_uploaded', COUNT(*) FILTER (WHERE status = 'payment_uploaded'),
    'payment_verified', COUNT(*) FILTER (WHERE status IN ('payment_verified', 'approved_pending_payment')),
    'contract_issued', COUNT(*) FILTER (WHERE status = 'contract_issued'),
    'active', COUNT(*) FILTER (WHERE status IN ('active', 'contacted', 'transferred_to_operations')),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'needs_review', COUNT(*) FILTER (WHERE status = 'issue'),
    'rejected', COUNT(*) FILTER (WHERE status IN ('rejected', 'cancelled'))
  )
  INTO v_result
  FROM b2f_investment_requests;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_b2f_requests_stats TO authenticated;
