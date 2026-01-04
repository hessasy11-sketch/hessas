/*
  # إصلاح الحقول والدوال المفقودة

  1. إضافة حقول مفقودة لـ b2f_investor_accounts
  2. إنشاء دالة get_investor_action_requests_stats
  3. إصلاح جدول investor_action_requests
*/

-- =====================================================
-- 1. إضافة حقول مفقودة لـ b2f_investor_accounts
-- =====================================================
ALTER TABLE b2f_investor_accounts 
  ADD COLUMN IF NOT EXISTS total_trees INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS investor_classification TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'exploring';

-- =====================================================
-- 2. إنشاء دالة get_investor_action_requests_stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_investor_action_requests_stats(
  p_investor_account_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_total INT := 0;
  v_pending INT := 0;
  v_approved INT := 0;
  v_rejected INT := 0;
BEGIN
  -- إذا لم يكن الجدول موجوداً، نرجع أصفار
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'investor_action_requests'
  ) THEN
    RETURN json_build_object(
      'total', 0,
      'pending', 0,
      'approved', 0,
      'rejected', 0
    );
  END IF;

  -- حساب الإحصائيات
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected')
  INTO v_total, v_pending, v_approved, v_rejected
  FROM investor_action_requests
  WHERE investor_account_id = p_investor_account_id;

  RETURN json_build_object(
    'total', COALESCE(v_total, 0),
    'pending', COALESCE(v_pending, 0),
    'approved', COALESCE(v_approved, 0),
    'rejected', COALESCE(v_rejected, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. التأكد من صلاحيات الوصول
-- =====================================================
GRANT EXECUTE ON FUNCTION get_investor_action_requests_stats TO authenticated, anon;

-- RLS لـ b2f_investor_accounts
ALTER TABLE b2f_investor_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read investor accounts" ON b2f_investor_accounts;
CREATE POLICY "Allow read investor accounts" 
  ON b2f_investor_accounts FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow insert investor accounts" ON b2f_investor_accounts;
CREATE POLICY "Allow insert investor accounts" 
  ON b2f_investor_accounts FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update investor accounts" ON b2f_investor_accounts;
CREATE POLICY "Allow update investor accounts" 
  ON b2f_investor_accounts FOR UPDATE 
  USING (true);

-- RLS لـ investor_action_requests
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_action_requests') THEN
    ALTER TABLE investor_action_requests ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow read action requests" ON investor_action_requests;
    CREATE POLICY "Allow read action requests" 
      ON investor_action_requests FOR SELECT 
      USING (true);
      
    DROP POLICY IF EXISTS "Allow insert action requests" ON investor_action_requests;
    CREATE POLICY "Allow insert action requests" 
      ON investor_action_requests FOR INSERT 
      WITH CHECK (true);
  END IF;
END $$;
