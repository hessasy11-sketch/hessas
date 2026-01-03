/*
  # نظام الفيديو الذكي لاستثمار المزارع B2F

  ## 1. الجداول الجديدة

  ### أ) b2f_videos (مكتبة الفيديوهات)
    - `id` (uuid, primary key)
    - `title` عنوان الفيديو
    - `description` وصف مختصر
    - `url` رابط الفيديو (YouTube/Vimeo)
    - `thumbnail_url` صورة مصغرة للفيديو
    - `type` نوع الفيديو
    - `duration_minutes` مدة الفيديو بالدقائق
    - `is_active` حالة التفعيل

  ### ب) b2f_video_bundles (باقات الفيديو)
    - `id` (uuid, primary key)
    - `name` اسم الباقة
    - `description` وصف الباقة
    - `icon` أيقونة الباقة
    - `color` لون الباقة
    - `is_active` حالة التفعيل

  ### ج) b2f_video_bundle_items (ربط الفيديوهات بالباقات)
    - `id` (uuid, primary key)
    - `bundle_id` → b2f_video_bundles.id
    - `video_id` → b2f_videos.id
    - `order_position` ترتيب الفيديو

  ### د) b2f_video_rules (قواعد العرض الذكية - العقل الصناعي)
    - `id` (uuid, primary key)
    - `bundle_id` → الباقة التي ستُعرض
    - `contract_status` حالة العقد
    - `visit_status` حالة الزيارة
    - `tree_type` نوع الشجرة
    - `priority` أولوية القاعدة
    - `is_active` حالة تفعيل القاعدة
    - `description` وصف القاعدة

  ## 2. الأمان (RLS)
    - الإدارة: قراءة وكتابة كاملة
    - المستثمرون: قراءة فقط للفيديوهات النشطة

  ## 3. دوال ذكية
    - get_recommended_video_bundles(): توصية الباقات حسب حالة المستثمر
    - get_bundle_videos(): الحصول على فيديوهات باقة معينة
*/

-- ========================================
-- أ) جدول الفيديوهات
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  thumbnail_url text,
  type text NOT NULL CHECK (type IN ('INTRO', 'TOUR', 'EXPLAINER', 'UPDATE', 'MAINTENANCE', 'GUIDE', 'FAQ')),
  duration_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage videos"
  ON b2f_videos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_settings
      WHERE setting_key = 'admin_pin'
      LIMIT 1
    )
  );

CREATE POLICY "Investors can view active videos"
  ON b2f_videos FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ========================================
-- ب) جدول باقات الفيديو
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_video_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text DEFAULT 'Video',
  color text DEFAULT 'blue',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE b2f_video_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage bundles"
  ON b2f_video_bundles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_settings
      WHERE setting_key = 'admin_pin'
      LIMIT 1
    )
  );

CREATE POLICY "Investors can view active bundles"
  ON b2f_video_bundles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ========================================
-- ج) جدول ربط الفيديوهات بالباقات
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_video_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES b2f_video_bundles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES b2f_videos(id) ON DELETE CASCADE,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bundle_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_bundle_items_bundle_order
  ON b2f_video_bundle_items(bundle_id, order_position);

ALTER TABLE b2f_video_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage bundle items"
  ON b2f_video_bundle_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_settings
      WHERE setting_key = 'admin_pin'
      LIMIT 1
    )
  );

CREATE POLICY "Investors can view bundle items"
  ON b2f_video_bundle_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_video_bundles
      WHERE id = bundle_id AND is_active = true
    )
    AND
    EXISTS (
      SELECT 1 FROM b2f_videos
      WHERE id = video_id AND is_active = true
    )
  );

-- ========================================
-- د) جدول قواعد العرض الذكية
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_video_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES b2f_video_bundles(id) ON DELETE CASCADE,
  contract_status text CHECK (
    contract_status IS NULL OR
    contract_status IN ('pending', 'approved', 'pending_payment', 'pending_verification', 'active', 'completed', 'cancelled')
  ),
  visit_status text CHECK (
    visit_status IS NULL OR
    visit_status IN ('none', 'requested', 'scheduled', 'completed', 'cancelled')
  ),
  tree_type text,
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_rules_active_priority
  ON b2f_video_rules(is_active, priority)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_video_rules_contract_status
  ON b2f_video_rules(contract_status, is_active)
  WHERE is_active = true;

ALTER TABLE b2f_video_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage rules"
  ON b2f_video_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_settings
      WHERE setting_key = 'admin_pin'
      LIMIT 1
    )
  );

CREATE POLICY "Investors can view active rules"
  ON b2f_video_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ========================================
-- هـ) دوال مساعدة (العقل الصناعي المحدود)
-- ========================================

CREATE OR REPLACE FUNCTION get_recommended_video_bundles(
  p_investor_phone text,
  p_contract_status text DEFAULT NULL,
  p_visit_status text DEFAULT 'none',
  p_tree_type text DEFAULT NULL
)
RETURNS TABLE (
  bundle_id uuid,
  bundle_name text,
  bundle_description text,
  bundle_icon text,
  bundle_color text,
  rule_priority integer,
  rule_description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (vb.id)
    vb.id as bundle_id,
    vb.name as bundle_name,
    vb.description as bundle_description,
    vb.icon as bundle_icon,
    vb.color as bundle_color,
    vr.priority as rule_priority,
    vr.description as rule_description
  FROM b2f_video_rules vr
  INNER JOIN b2f_video_bundles vb ON vb.id = vr.bundle_id
  WHERE vr.is_active = true
    AND vb.is_active = true
    AND (
      vr.contract_status IS NULL
      OR vr.contract_status = p_contract_status
    )
    AND (
      vr.visit_status IS NULL
      OR vr.visit_status = p_visit_status
    )
    AND (
      vr.tree_type IS NULL
      OR vr.tree_type = p_tree_type
    )
  ORDER BY vb.id, vr.priority ASC, vr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_bundle_videos(p_bundle_id uuid)
RETURNS TABLE (
  video_id uuid,
  title text,
  description text,
  url text,
  thumbnail_url text,
  type text,
  duration_minutes integer,
  order_position integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as video_id,
    v.title,
    v.description,
    v.url,
    v.thumbnail_url,
    v.type,
    v.duration_minutes,
    vbi.order_position
  FROM b2f_video_bundle_items vbi
  INNER JOIN b2f_videos v ON v.id = vbi.video_id
  WHERE vbi.bundle_id = p_bundle_id
    AND v.is_active = true
  ORDER BY vbi.order_position ASC, v.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- و) بيانات تجريبية
-- ========================================

INSERT INTO b2f_videos (title, description, url, type, duration_minutes, is_active) VALUES
  ('مرحباً بك في استثمار المزارع', 'فيديو تعريفي يشرح أساسيات الاستثمار في أشجار المزارع', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'INTRO', 5, true),
  ('جولة في مزارعنا', 'شاهد المزارع المتاحة للاستثمار والأشجار المثمرة', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TOUR', 8, true),
  ('كيفية تتبع استثمارك', 'دليل شامل لاستخدام لوحة التحكم ومتابعة عقودك', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'EXPLAINER', 6, true),
  ('التحضير لزيارة المزرعة', 'نصائح وإرشادات قبل زيارتك الميدانية للمزرعة', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'GUIDE', 4, true),
  ('أسئلة شائعة عن الاستثمار', 'إجابات عن أكثر الأسئلة شيوعاً من المستثمرين', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'FAQ', 7, true),
  ('تقرير نمو الأشجار - موسم 2024', 'آخر التحديثات حول نمو الأشجار وموسم الحصاد', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'UPDATE', 5, true)
ON CONFLICT DO NOTHING;

INSERT INTO b2f_video_bundles (name, description, icon, color, is_active) VALUES
  ('البداية - مستثمر جديد', 'فيديوهات تعريفية للمستثمرين الجدد قبل تفعيل العقد', 'PlayCircle', 'emerald', true),
  ('الاستعداد للزيارة', 'فيديوهات مفيدة للتحضير لزيارة المزرعة', 'MapPin', 'orange', true),
  ('إدارة استثماراتي', 'دليل شامل لإدارة ومتابعة عقودك النشطة', 'FileCheck', 'blue', true),
  ('محتوى عام ومفيد', 'فيديوهات عامة متاحة لجميع المستثمرين', 'Video', 'purple', true)
ON CONFLICT DO NOTHING;

INSERT INTO b2f_video_bundle_items (bundle_id, video_id, order_position)
SELECT
  (SELECT id FROM b2f_video_bundles WHERE name = 'البداية - مستثمر جديد'),
  id,
  (row_number() OVER ()) * 10
FROM b2f_videos
WHERE type IN ('INTRO', 'TOUR')
ON CONFLICT DO NOTHING;

INSERT INTO b2f_video_bundle_items (bundle_id, video_id, order_position)
SELECT
  (SELECT id FROM b2f_video_bundles WHERE name = 'الاستعداد للزيارة'),
  id,
  (row_number() OVER ()) * 10
FROM b2f_videos
WHERE type IN ('GUIDE', 'TOUR')
ON CONFLICT DO NOTHING;

INSERT INTO b2f_video_bundle_items (bundle_id, video_id, order_position)
SELECT
  (SELECT id FROM b2f_video_bundles WHERE name = 'إدارة استثماراتي'),
  id,
  (row_number() OVER ()) * 10
FROM b2f_videos
WHERE type IN ('EXPLAINER', 'UPDATE')
ON CONFLICT DO NOTHING;

INSERT INTO b2f_video_rules (bundle_id, contract_status, visit_status, tree_type, priority, description, is_active) VALUES
  (
    (SELECT id FROM b2f_video_bundles WHERE name = 'البداية - مستثمر جديد'),
    'pending',
    'none',
    NULL,
    10,
    'فيديوهات تعريفية للمستثمرين الجدد قبل إتمام الدفع',
    true
  ),
  (
    (SELECT id FROM b2f_video_bundles WHERE name = 'البداية - مستثمر جديد'),
    'approved',
    'none',
    NULL,
    20,
    'فيديوهات تعريفية للعقود الموافق عليها بانتظار الدفع',
    true
  ),
  (
    (SELECT id FROM b2f_video_bundles WHERE name = 'الاستعداد للزيارة'),
    NULL,
    'requested',
    NULL,
    30,
    'فيديوهات التحضير للزيارة عند طلب زيارة جديدة',
    true
  ),
  (
    (SELECT id FROM b2f_video_bundles WHERE name = 'الاستعداد للزيارة'),
    NULL,
    'scheduled',
    NULL,
    25,
    'فيديوهات التحضير للزيارة المجدولة',
    true
  ),
  (
    (SELECT id FROM b2f_video_bundles WHERE name = 'إدارة استثماراتي'),
    'active',
    NULL,
    NULL,
    40,
    'فيديوهات إدارة الاستثمارات للعقود النشطة',
    true
  ),
  (
    (SELECT id FROM b2f_video_bundles WHERE name = 'محتوى عام ومفيد'),
    NULL,
    NULL,
    NULL,
    1000,
    'محتوى عام متاح دائماً لجميع المستثمرين',
    true
  )
ON CONFLICT DO NOTHING;
