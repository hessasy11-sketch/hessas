/*
  # نظام طلبات الإجراءات السريعة للمستثمرين

  1. الجدول الجديد
    - `investor_action_requests`
      - `id` (uuid, primary key)
      - `investor_account_id` (uuid, reference to b2f_investor_accounts)
      - `action_type` (text: harvest, gift, charity, transfer, visit)
      - `status` (text: pending, in_progress, completed, cancelled)
      - `notes` (text, nullable)
      - `admin_notes` (text, nullable)
      - `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS
    - سياسات للمستثمرين لإضافة وعرض طلباتهم
    - سياسات للإدارة لعرض وتحديث جميع الطلبات
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS investor_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('harvest', 'gift', 'charity', 'transfer', 'visit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes text,
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- فهرسة للأداء
CREATE INDEX IF NOT EXISTS idx_investor_action_requests_account ON investor_action_requests(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_investor_action_requests_status ON investor_action_requests(status);
CREATE INDEX IF NOT EXISTS idx_investor_action_requests_type ON investor_action_requests(action_type);
CREATE INDEX IF NOT EXISTS idx_investor_action_requests_created ON investor_action_requests(created_at DESC);

-- تفعيل RLS
ALTER TABLE investor_action_requests ENABLE ROW LEVEL SECURITY;

-- سياسة: المستثمرون يمكنهم إنشاء طلباتهم الخاصة
CREATE POLICY "Investors can create their own action requests"
  ON investor_action_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE b2f_investor_accounts.id = investor_account_id
      AND b2f_investor_accounts.user_id = auth.uid()
    )
  );

-- سياسة: المستثمرون يمكنهم عرض طلباتهم الخاصة
CREATE POLICY "Investors can view their own action requests"
  ON investor_action_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE b2f_investor_accounts.id = investor_account_id
      AND b2f_investor_accounts.user_id = auth.uid()
    )
  );

-- سياسة: المستثمرون يمكنهم تحديث ملاحظاتهم فقط
CREATE POLICY "Investors can update their own notes"
  ON investor_action_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE b2f_investor_accounts.id = investor_account_id
      AND b2f_investor_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE b2f_investor_accounts.id = investor_account_id
      AND b2f_investor_accounts.user_id = auth.uid()
    )
  );

-- سياسة: الإدارة يمكنها عرض جميع الطلبات
CREATE POLICY "Admins can view all action requests"
  ON investor_action_requests
  FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

-- سياسة: الإدارة يمكنها تحديث جميع الطلبات
CREATE POLICY "Admins can update all action requests"
  ON investor_action_requests
  FOR UPDATE
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_investor_action_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- إذا تم تحديث الحالة إلى completed، حدد completed_at
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_investor_action_requests_updated_at_trigger ON investor_action_requests;
CREATE TRIGGER update_investor_action_requests_updated_at_trigger
  BEFORE UPDATE ON investor_action_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_action_requests_updated_at();

-- دالة للحصول على إحصائيات الطلبات
CREATE OR REPLACE FUNCTION get_investor_action_requests_stats(account_id_param uuid)
RETURNS json AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
      'by_type', json_build_object(
        'harvest', COUNT(*) FILTER (WHERE action_type = 'harvest'),
        'gift', COUNT(*) FILTER (WHERE action_type = 'gift'),
        'charity', COUNT(*) FILTER (WHERE action_type = 'charity'),
        'transfer', COUNT(*) FILTER (WHERE action_type = 'transfer'),
        'visit', COUNT(*) FILTER (WHERE action_type = 'visit')
      )
    )
    FROM investor_action_requests
    WHERE investor_account_id = account_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على آخر الطلبات
CREATE OR REPLACE FUNCTION get_recent_action_requests(account_id_param uuid, limit_param int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  action_type text,
  status text,
  notes text,
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    iar.id,
    iar.action_type,
    iar.status,
    iar.notes,
    iar.admin_notes,
    iar.completed_at,
    iar.created_at,
    iar.updated_at
  FROM investor_action_requests iar
  WHERE iar.investor_account_id = account_id_param
  ORDER BY iar.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليق على الجدول
COMMENT ON TABLE investor_action_requests IS 'جدول لحفظ طلبات الإجراءات السريعة من المستثمرين (استلام المحصول، إهداء، صدقة، نقل عقد، زيارة)';
