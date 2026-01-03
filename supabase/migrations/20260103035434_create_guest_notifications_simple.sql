/*
  # إنشاء نظام إشعارات الزوار البسيط

  1. الجداول الجديدة
    - b2f_guest_notifications: جدول إشعارات الزوار

  2. الدوال
    - get_active_guest_notifications(): جلب الإشعارات النشطة

  3. الأمان
    - RLS مفعّل
    - الجميع يمكنهم القراءة
    - الإداريون يمكنهم الإدارة
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_guest_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  link text,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_priority CHECK (priority IN ('urgent', 'important', 'normal'))
);

-- تفعيل RLS
ALTER TABLE b2f_guest_notifications ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Anyone can view active guest notifications" ON b2f_guest_notifications;
DROP POLICY IF EXISTS "Admins can manage guest notifications" ON b2f_guest_notifications;
DROP POLICY IF EXISTS "Service role can manage guest notifications" ON b2f_guest_notifications;

-- السماح للجميع بقراءة الإشعارات النشطة
CREATE POLICY "Anyone can view active guest notifications"
  ON b2f_guest_notifications
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true 
    AND start_date <= now()
    AND (end_date IS NULL OR end_date >= now())
  );

-- السماح لـ service_role بالإدارة الكاملة
CREATE POLICY "Service role can manage guest notifications"
  ON b2f_guest_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- حذف الدالات القديمة
DROP FUNCTION IF EXISTS get_active_guest_notifications();
DROP FUNCTION IF EXISTS get_active_guest_notifications(text);

-- إنشاء دالة جلب الإشعارات النشطة
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
  WHERE 
    gn.is_active = true
    AND gn.start_date <= NOW()
    AND (gn.end_date IS NULL OR gn.end_date >= NOW())
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

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_active_guest_notifications() TO anon, authenticated;

-- إدراج إشعار تجريبي
INSERT INTO b2f_guest_notifications (type, priority, title, message, icon, is_active)
VALUES 
  ('info', 'normal', 'مرحباً بك في نظام إدارة المزارع', 'استمتع بتجربة استثمارية متميزة مع فرصنا الزراعية المتنوعة', '🌳', true)
ON CONFLICT DO NOTHING;
