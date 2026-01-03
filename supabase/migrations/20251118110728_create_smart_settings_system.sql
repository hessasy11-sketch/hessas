/*
  # إنشاء نظام الإعدادات الذكي المتطور
  
  1. الجداول الجديدة:
    - system_settings: إعدادات النظام الشاملة
    - live_metrics: المقاييس اللحظية
    - ai_recommendations: توصيات الذكاء الصناعي
    - system_logs: سجلات النظام
    - slider_settings: إعدادات السلايدرات
    - filter_settings: إعدادات الفلاتر
    - seller_tools_config: إعدادات أدوات البائع
    - ui_themes: ثيمات الواجهة
    
  2. الأمان:
    - RLS للمسؤولين فقط
*/

-- جدول الإعدادات الرئيسي
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  setting_type text NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- جدول المقاييس اللحظية
CREATE TABLE IF NOT EXISTS live_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_value jsonb NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

-- جدول توصيات الذكاء الصناعي
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type text NOT NULL,
  recommendation_data jsonb NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- جدول سجلات النظام
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  action_data jsonb NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  impact_analysis jsonb,
  created_at timestamptz DEFAULT now()
);

-- جدول إعدادات السلايدرات
CREATE TABLE IF NOT EXISTS slider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slider_name text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT true,
  order_index integer,
  spacing integer DEFAULT 4,
  speed text DEFAULT 'normal',
  animation_type text DEFAULT 'slide',
  card_size text DEFAULT 'medium',
  auto_sort boolean DEFAULT false,
  sort_criteria jsonb,
  updated_at timestamptz DEFAULT now()
);

-- جدول إعدادات الفلاتر
CREATE TABLE IF NOT EXISTS filter_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_name text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT true,
  order_index integer,
  is_predictive boolean DEFAULT false,
  prediction_criteria jsonb,
  updated_at timestamptz DEFAULT now()
);

-- جدول إعدادات أدوات البائع
CREATE TABLE IF NOT EXISTS seller_tools_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text UNIQUE NOT NULL,
  tool_description text,
  is_enabled boolean DEFAULT true,
  available_for_free boolean DEFAULT false,
  available_for_silver boolean DEFAULT true,
  available_for_gold boolean DEFAULT true,
  is_ai_powered boolean DEFAULT false,
  ai_features jsonb,
  is_seasonal boolean DEFAULT false,
  season_config jsonb,
  updated_at timestamptz DEFAULT now()
);

-- جدول ثيمات الواجهة
CREATE TABLE IF NOT EXISTS ui_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name text UNIQUE NOT NULL,
  theme_config jsonb NOT NULL,
  is_active boolean DEFAULT false,
  is_seasonal boolean DEFAULT false,
  season_dates jsonb,
  created_at timestamptz DEFAULT now()
);

-- جدول إحصائيات الأداء
CREATE TABLE IF NOT EXISTS performance_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_type text NOT NULL,
  stat_data jsonb NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_tools_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admins only
CREATE POLICY "Admins can view system_settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update system_settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Similar policies for other tables
CREATE POLICY "Admins can manage live_metrics"
  ON live_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage ai_recommendations"
  ON ai_recommendations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage system_logs"
  ON system_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage slider_settings"
  ON slider_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage filter_settings"
  ON filter_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage seller_tools_config"
  ON seller_tools_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage ui_themes"
  ON ui_themes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage performance_stats"
  ON performance_stats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- إدراج بيانات أولية للسلايدرات
INSERT INTO slider_settings (slider_name, order_index, spacing, speed, animation_type) VALUES
  ('categories', 1, 4, 'normal', 'slide'),
  ('regions', 2, 4, 'normal', 'slide'),
  ('featured_auctions', 3, 6, 'normal', 'smooth')
ON CONFLICT (slider_name) DO NOTHING;

-- إدراج بيانات أولية للفلاتر
INSERT INTO filter_settings (filter_name, is_enabled, order_index) VALUES
  ('region', true, 1),
  ('city', true, 2),
  ('category', true, 3),
  ('price', true, 4),
  ('time_remaining', true, 5),
  ('plan_type', true, 6),
  ('auction_type', true, 7),
  ('status', true, 8)
ON CONFLICT (filter_name) DO NOTHING;

-- إدراج بيانات أولية لأدوات البائع
INSERT INTO seller_tools_config (tool_name, tool_description, available_for_free, available_for_silver, available_for_gold, is_ai_powered) VALUES
  ('basic_listing', 'إنشاء مزاد أساسي', true, true, true, false),
  ('photo_upload', 'رفع الصور', true, true, true, false),
  ('price_suggestion', 'اقتراح السعر بالذكاء الصناعي', false, true, true, true),
  ('timing_optimizer', 'اقتراح أفضل وقت للإغلاق', false, true, true, true),
  ('bid_analyzer', 'تحليل المزايدين', false, false, true, true),
  ('auto_extend', 'التمديد التلقائي', false, false, true, false),
  ('premium_placement', 'الظهور المميز', false, false, true, false),
  ('analytics_dashboard', 'لوحة التحليلات', false, false, true, true)
ON CONFLICT (tool_name) DO NOTHING;
