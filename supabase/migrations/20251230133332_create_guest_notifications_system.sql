/*
  # نظام إشعارات الزوار - Guest Notifications System
  
  1. جدول جديد
    - `b2f_guest_notifications`
      - إشعارات عامة للزوار غير المسجلين
      - ترحيب وعروض وفرص استثمارية
      - يظهر للجميع قبل التسجيل
  
  2. الصلاحيات
    - الزوار: قراءة فقط
    - الإدارة: إنشاء وتعديل وحذف
  
  3. الميزات
    - إشعارات ترحيبية
    - عروض خاصة
    - فرص استثمارية جديدة
    - أخبار النظام
*/

-- إنشاء جدول إشعارات الزوار
CREATE TABLE IF NOT EXISTS b2f_guest_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- محتوى الإشعار
  type TEXT NOT NULL CHECK (type IN ('welcome', 'opportunity', 'offer', 'system', 'news')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📢',
  
  -- التفاعل
  link TEXT,
  action_text TEXT, -- مثل "سجل الآن" أو "اعرف المزيد"
  
  -- العرض
  display_as TEXT NOT NULL DEFAULT 'banner' CHECK (display_as IN ('banner', 'toast', 'modal', 'notification')),
  show_on_pages TEXT[] DEFAULT ARRAY['home', 'opportunities', 'all'], -- الصفحات التي يظهر فيها
  
  -- التحكم
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  max_views INTEGER, -- حد أقصى لعدد المشاهدات
  current_views INTEGER DEFAULT 0,
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_guest_notifications_active ON b2f_guest_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_dates ON b2f_guest_notifications(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_guest_notifications_type ON b2f_guest_notifications(type);

-- RLS Policies
ALTER TABLE b2f_guest_notifications ENABLE ROW LEVEL SECURITY;

-- الزوار: يمكنهم قراءة الإشعارات النشطة فقط
CREATE POLICY "Anyone can view active guest notifications"
  ON b2f_guest_notifications
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true 
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
    AND (max_views IS NULL OR current_views < max_views)
  );

-- الإدارة: التحكم الكامل
CREATE POLICY "Admins can manage guest notifications"
  ON b2f_guest_notifications
  FOR ALL
  TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

-- Function لزيادة عدد المشاهدات
CREATE OR REPLACE FUNCTION increment_guest_notification_views(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE b2f_guest_notifications
  SET current_views = current_views + 1
  WHERE id = notification_id;
END;
$$;

-- Function للحصول على الإشعارات النشطة للزوار
CREATE OR REPLACE FUNCTION get_active_guest_notifications(page_name TEXT DEFAULT 'all')
RETURNS TABLE (
  id UUID,
  type TEXT,
  priority TEXT,
  title TEXT,
  message TEXT,
  icon TEXT,
  link TEXT,
  action_text TEXT,
  display_as TEXT
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
    gn.action_text,
    gn.display_as
  FROM b2f_guest_notifications gn
  WHERE 
    gn.is_active = true
    AND gn.start_date <= NOW()
    AND (gn.end_date IS NULL OR gn.end_date >= NOW())
    AND (gn.max_views IS NULL OR gn.current_views < gn.max_views)
    AND (page_name = 'all' OR 'all' = ANY(gn.show_on_pages) OR page_name = ANY(gn.show_on_pages))
  ORDER BY 
    CASE gn.priority
      WHEN 'urgent' THEN 1
      WHEN 'important' THEN 2
      ELSE 3
    END,
    gn.created_at DESC;
END;
$$;

-- إضافة إشعارات ترحيبية افتراضية
INSERT INTO b2f_guest_notifications (type, priority, title, message, icon, action_text, link, display_as, show_on_pages) VALUES
(
  'welcome',
  'important',
  'مرحباً بك في منصة استثمار أشجار المزارع',
  'اكتشف فرص استثمارية مربحة ومضمونة في القطاع الزراعي. سجل الآن وابدأ رحلتك الاستثمارية!',
  '🌳',
  'سجل الآن',
  '/b2f',
  'banner',
  ARRAY['home', 'all']
),
(
  'opportunity',
  'urgent',
  'فرصة استثمارية جديدة متاحة الآن',
  'عدد محدود من الأشجار المتاحة للاستثمار! لا تفوت هذه الفرصة الذهبية للاستثمار في الزراعة المربحة.',
  '🔥',
  'اعرف المزيد',
  '/b2f/opportunities',
  'toast',
  ARRAY['all']
),
(
  'offer',
  'important',
  'عرض خاص للمستثمرين الجدد',
  'خصم 20% على رسوم التشغيل للمشتركين الجدد خلال هذا الشهر فقط!',
  '🎁',
  'استفد الآن',
  '/b2f',
  'notification',
  ARRAY['opportunities', 'all']
);

-- إضافة تعليق
COMMENT ON TABLE b2f_guest_notifications IS 'إشعارات عامة للزوار غير المسجلين - ترحيب وعروض وفرص';
