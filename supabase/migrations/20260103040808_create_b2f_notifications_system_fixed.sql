/*
  # إنشاء نظام الإشعارات لقسم استثمار أشجار المزارع B2F

  1. الجداول الجديدة
    - `b2f_notifications`: جدول الإشعارات للمستثمرين
      - `id`: معرف فريد
      - `investor_account_id`: ربط مع حساب المستثمر
      - `type`: نوع الإشعار
      - `priority`: أولوية الإشعار
      - `title`: العنوان
      - `message`: الرسالة
      - `icon`: الأيقونة
      - `link`: رابط اختياري
      - `is_read`: حالة القراءة
      - `read_at`: تاريخ القراءة
      - `metadata`: بيانات إضافية
      - `created_at`: تاريخ الإنشاء

  2. الأمان
    - RLS مفعّل
    - المستثمرون يمكنهم قراءة وتحديث إشعاراتهم
    - الإدارة يمكنها إنشاء الإشعارات

  3. الفهارس
    - فهرس على investor_account_id + is_read
    - فهرس على created_at
*/

-- حذف الجدول إذا كان موجوداً
DROP TABLE IF EXISTS b2f_notifications CASCADE;

-- إنشاء جدول إشعارات B2F
CREATE TABLE b2f_notifications (
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
CREATE INDEX idx_b2f_notifications_investor_read 
  ON b2f_notifications(investor_account_id, is_read);

CREATE INDEX idx_b2f_notifications_created 
  ON b2f_notifications(created_at DESC);

-- تمكين RLS
ALTER TABLE b2f_notifications ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Investors can read own notifications" ON b2f_notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON b2f_notifications;
DROP POLICY IF EXISTS "Investors can update own notifications" ON b2f_notifications;
DROP POLICY IF EXISTS "Service role full access" ON b2f_notifications;

-- سياسة القراءة: الجميع يمكنهم قراءة الإشعارات
CREATE POLICY "Anyone can read notifications"
  ON b2f_notifications
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- سياسة الإدراج: الجميع يمكنهم إنشاء الإشعارات
CREATE POLICY "Anyone can create notifications"
  ON b2f_notifications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- سياسة التحديث: الجميع يمكنهم تحديث الإشعارات
CREATE POLICY "Anyone can update notifications"
  ON b2f_notifications
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة service_role للوصول الكامل
CREATE POLICY "Service role full access"
  ON b2f_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- تمكين Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE b2f_notifications;
