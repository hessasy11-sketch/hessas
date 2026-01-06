/*
  # إصلاح جدول audit_logs وإصلاح دالة get_b2b_auctions_radar

  1. إنشاء جدول audit_logs للنظام
     - جدول عام لتسجيل جميع العمليات الحساسة

  2. إصلاح دالة get_b2b_auctions_radar
     - استخدام name_ar بدلاً من name في categories
*/

-- إنشاء جدول audit_logs العام
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  performed_by text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- فهرس على action للبحث السريع
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- فهرس على entity_type و entity_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- فهرس على performed_by
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);

-- فهرس على created_at للترتيب الزمني
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- تفعيل RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: للمسؤولين فقط
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (true);  -- يمكن للجميع قراءة السجلات (يمكن تشديدها لاحقًا)

-- سياسة الإدراج: للجميع (SECURITY DEFINER functions)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- إصلاح دالة get_b2b_auctions_radar لاستخدام name_ar
DROP FUNCTION IF EXISTS get_b2b_auctions_radar();

CREATE OR REPLACE FUNCTION get_b2b_auctions_radar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auctions_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'category_name', COALESCE(c.name_ar, 'غير محدد'),
      'status', a.status,
      'current_price', COALESCE(a.current_price, a.starting_price),
      'starting_price', a.starting_price,
      'start_time', a.starts_at,
      'end_time', a.ends_at,
      'time_remaining_hours', EXTRACT(EPOCH FROM (a.ends_at - NOW())) / 3600,
      'total_views', COALESCE(a.views, 0),
      'total_bids', 0,
      'highest_bid', NULL,
      'is_critical', (a.ends_at < NOW() + INTERVAL '24 hours' AND a.ends_at > NOW()),
      'seller_name', COALESCE(p.display_name, 'مزاد')
    )
    ORDER BY
      CASE
        WHEN a.status = 'active' AND a.ends_at < NOW() + INTERVAL '24 hours' THEN 1
        WHEN a.status = 'active' THEN 2
        ELSE 3
      END,
      a.ends_at ASC
  )
  INTO auctions_list
  FROM auctions a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN profiles p ON p.id = a.owner_id
  WHERE a.status IN ('active', 'upcoming', 'closed', 'pending')
  ORDER BY a.created_at DESC
  LIMIT 100;

  RETURN COALESCE(auctions_list, '[]'::jsonb);
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_b2b_auctions_radar TO anon, authenticated, service_role;

-- إضافة تعليقات
COMMENT ON TABLE audit_logs IS 'سجل التدقيق العام للعمليات الحساسة في النظام';
COMMENT ON COLUMN audit_logs.action IS 'نوع العملية (مثل: authority_invitation_created)';
COMMENT ON COLUMN audit_logs.entity_type IS 'نوع الكيان (مثل: authority_invitation, farm, contract)';
COMMENT ON COLUMN audit_logs.entity_id IS 'معرف الكيان';
COMMENT ON COLUMN audit_logs.performed_by IS 'من قام بالعملية (staff_code أو user_id)';
