-- إنشاء نظام الإشعارات لقسم استثمار أشجار المزارع B2F
-- 
-- 1. الجداول الجديدة
--    - b2f_notifications
-- 
-- 2. الأمان
--    - تمكين RLS على الجدول
--    - سياسات للقراءة والإدراج والتحديث
--    - المستثمرون يمكنهم قراءة وتحديث إشعاراتهم فقط
--    - الإدارة يمكنها إنشاء الإشعارات
-- 
-- 3. الفهارس
--    - فهرس على investor_account_id + is_read للأداء
--    - فهرس على created_at لترتيب الإشعارات

-- إنشاء جدول إشعارات B2F
CREATE TABLE IF NOT EXISTS b2f_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_account_id uuid NOT NULL REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking', 'payment', 'contract', 'certificate', 'operation', 'visit', 'season', 'system')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  title text NOT NULL,
  message text NOT NULL,
  icon text NOT NULL DEFAULT '🔔',
  link text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_b2f_notifications_investor_read 
  ON b2f_notifications(investor_account_id, is_read);

CREATE INDEX IF NOT EXISTS idx_b2f_notifications_created 
  ON b2f_notifications(created_at DESC);

-- تمكين RLS
ALTER TABLE b2f_notifications ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستثمرون يمكنهم قراءة إشعاراتهم فقط
CREATE POLICY "Investors can read own notifications"
  ON b2f_notifications
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE b2f_investor_accounts.id = b2f_notifications.investor_account_id
    )
  );

-- سياسة الإدراج: الإدارة والنظام يمكنهم إنشاء الإشعارات
CREATE POLICY "Admins can create notifications"
  ON b2f_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة التحديث: المستثمرون يمكنهم تحديث حالة القراءة لإشعاراتهم
CREATE POLICY "Investors can update own notifications"
  ON b2f_notifications
  FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE b2f_investor_accounts.id = b2f_notifications.investor_account_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE b2f_investor_accounts.id = b2f_notifications.investor_account_id
    )
  );

-- تمكين Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE b2f_notifications;
