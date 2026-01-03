/*
  # إنشاء نظام لوحة التحكم الإدارية

  1. جداول جديدة
    - `dashboard_sections` - أقسام لوحة التحكم الستة
    - `dashboard_stats` - إحصائيات كل قسم
    - `admin_activity_log` - سجل نشاط الإدارة
    - `smart_brain_logs` - سجلات العقل الصناعي
    
  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات الوصول للمسؤولين فقط
*/

-- جدول أقسام لوحة التحكم
CREATE TABLE IF NOT EXISTS dashboard_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  section_name text NOT NULL,
  section_name_en text NOT NULL,
  description text,
  color text NOT NULL,
  icon text NOT NULL,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- جدول إحصائيات الأقسام
CREATE TABLE IF NOT EXISTS dashboard_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL REFERENCES dashboard_sections(section_key),
  active_auctions integer DEFAULT 0,
  total_auctions integer DEFAULT 0,
  pending_reports integer DEFAULT 0,
  blocked_users integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_bids integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- جدول سجل النشاط الإداري
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id),
  section_key text REFERENCES dashboard_sections(section_key),
  action_type text NOT NULL,
  action_details text,
  target_id uuid,
  created_at timestamptz DEFAULT now()
);

-- جدول سجلات العقل الصناعي
CREATE TABLE IF NOT EXISTS smart_brain_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  section_key text REFERENCES dashboard_sections(section_key),
  user_id uuid REFERENCES profiles(id),
  auction_id uuid REFERENCES auctions(id),
  message_content text,
  behavior_pattern text,
  sentiment_score numeric,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE dashboard_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_brain_logs ENABLE ROW LEVEL SECURITY;

-- سياسات للمسؤولين فقط (يتم التحديث لاحقاً بنظام الأدوار)
CREATE POLICY "Admins can view dashboard sections"
  ON dashboard_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can view dashboard stats"
  ON dashboard_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can view activity log"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can insert activity log"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "System can view smart brain logs"
  ON smart_brain_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert smart brain logs"
  ON smart_brain_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إدراج الأقسام الستة
INSERT INTO dashboard_sections (section_key, section_name, section_name_en, description, color, icon, display_order) VALUES
  ('public', 'المزادات العامة', 'Public Auctions', 'قسم إدارة المزادات المفتوحة للعامة والعروض الفردية', '#10B981', '🌿', 1),
  ('b2b', 'الشركات والمزارع', 'B2B Auctions', 'قسم مختص بالموردين والشركات الزراعية والمزارع', '#3B82F6', '🏢', 2),
  ('official', 'المنصة الرسمية', 'Official Platform Auctions', 'المزادات الرسمية الخاصة بالمنصة مثل تملك النخيل والزيتون', '#F59E0B', '🏆', 3),
  ('groups', 'مزادات القروبات', 'Group Auctions', 'قسم خاص بمشرفي القروبات للمزادات المغلقة', '#F97316', '👥', 4),
  ('collectibles', 'المقتنيات النادرة', 'Rare Collectibles', 'قسم مخصص للمقتنيات الزراعية والتحف القديمة', '#8B5CF6', '💎', 5),
  ('smartbrain', 'العقل الصناعي المحدود', 'Smart Brain AI', 'مركز الذكاء الصناعي لجمع البيانات والتعلم الذاتي', '#94A3B8', '🤖', 6)
ON CONFLICT (section_key) DO NOTHING;

-- إنشاء إحصائيات أولية لكل قسم
INSERT INTO dashboard_stats (section_key)
SELECT section_key FROM dashboard_sections
ON CONFLICT DO NOTHING;

-- دالة لتحديث إحصائيات المزادات
CREATE OR REPLACE FUNCTION update_dashboard_stats()
RETURNS void AS $$
BEGIN
  -- تحديث إحصائيات المزادات العامة (يمكن تطويرها لاحقاً)
  UPDATE dashboard_stats
  SET 
    total_auctions = (SELECT COUNT(*) FROM auctions),
    active_auctions = (SELECT COUNT(*) FROM auctions WHERE status = 'active'),
    pending_reports = (SELECT COUNT(*) FROM auction_reports WHERE resolved_at IS NULL),
    total_views = (SELECT COALESCE(SUM(views_count), 0) FROM auctions),
    updated_at = now()
  WHERE section_key = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;