/*
  # إنشاء نظام إشعارات الزوار لقسم B2F

  1. جدول جديد
    - `b2f_guest_notifications`
      - `id` (uuid, primary key)
      - `type` (text) - نوع الإشعار
      - `priority` (text) - الأولوية: normal, important, urgent
      - `title` (text) - عنوان الإشعار
      - `message` (text) - محتوى الرسالة
      - `icon` (text) - الأيقونة
      - `link` (text) - رابط اختياري
      - `is_active` (boolean) - حالة التفعيل
      - `start_date` (timestamptz) - تاريخ البدء
      - `end_date` (timestamptz) - تاريخ الانتهاء (اختياري)
      - `created_by` (uuid) - معرف الإداري الذي أنشأ الإشعار
      - `metadata` (jsonb) - بيانات إضافية
      - `created_at` (timestamptz) - تاريخ الإنشاء
      - `updated_at` (timestamptz) - تاريخ آخر تحديث

  2. الأمان
    - تمكين RLS
    - سياسة للقراءة: الجميع يمكنهم قراءة الإشعارات النشطة
    - سياسة للإدراج/التحديث: الإدارة فقط

  3. الفهارس
    - فهرس على is_active + created_at للأداء
    - فهرس على start_date و end_date

  4. الوظائف
    - دالة للحصول على الإشعارات النشطة حالياً
*/

-- إنشاء جدول إشعارات الزوار
CREATE TABLE IF NOT EXISTS b2f_guest_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'system' CHECK (type IN ('announcement', 'offer', 'update', 'event', 'system')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  title text NOT NULL,
  message text NOT NULL,
  icon text NOT NULL DEFAULT '📢',
  link text,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_b2f_guest_notifications_active 
  ON b2f_guest_notifications(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2f_guest_notifications_dates 
  ON b2f_guest_notifications(start_date, end_date);

-- تمكين RLS
ALTER TABLE b2f_guest_notifications ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الإشعارات النشطة
CREATE POLICY "Anyone can read active guest notifications"
  ON b2f_guest_notifications
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true 
    AND start_date <= now() 
    AND (end_date IS NULL OR end_date >= now())
  );

-- سياسة الإدراج: الإدارة فقط
CREATE POLICY "Admins can create guest notifications"
  ON b2f_guest_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_b2f_admin());

-- سياسة التحديث: الإدارة فقط
CREATE POLICY "Admins can update guest notifications"
  ON b2f_guest_notifications
  FOR UPDATE
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- سياسة الحذف: الإدارة فقط
CREATE POLICY "Admins can delete guest notifications"
  ON b2f_guest_notifications
  FOR DELETE
  TO authenticated
  USING (is_b2f_admin());

-- دالة للحصول على الإشعارات النشطة حالياً
CREATE OR REPLACE FUNCTION get_active_guest_notifications()
RETURNS TABLE (
  id uuid,
  type text,
  priority text,
  title text,
  message text,
  icon text,
  link text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gn.id,
    gn.type,
    gn.priority,
    gn.title,
    gn.message,
    gn.icon,
    gn.link,
    gn.created_at
  FROM b2f_guest_notifications gn
  WHERE gn.is_active = true
    AND gn.start_date <= now()
    AND (gn.end_date IS NULL OR gn.end_date >= now())
  ORDER BY 
    CASE gn.priority
      WHEN 'urgent' THEN 1
      WHEN 'important' THEN 2
      ELSE 3
    END,
    gn.created_at DESC
  LIMIT 20;
END;
$$;

-- تمكين Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE b2f_guest_notifications;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_guest_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_b2f_guest_notifications_updated_at
  BEFORE UPDATE ON b2f_guest_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_guest_notifications_updated_at();
