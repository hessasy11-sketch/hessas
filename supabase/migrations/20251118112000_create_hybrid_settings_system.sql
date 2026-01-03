/*
  # نظام الإعدادات الهجين للمزادات العامة
  
  ## الطبقات الثلاث
  
  ### 1. Core Layer - الإعدادات المشتركة
  ### 2. Module Layer - إعدادات المزادات العامة  
  ### 3. AI Layer - الذكاء الصناعي المخصص
*/

-- ═══════════════════════════════════════════════════════════
-- 🟦 CORE LAYER - الطبقة المشتركة
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS core_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  category text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core_slider_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_type text DEFAULT 'smooth',
  default_speed text DEFAULT 'normal',
  active_effect text DEFAULT 'scale',
  default_card_size text DEFAULT 'medium',
  swipe_engine text DEFAULT 'standard',
  baseline_spacing integer DEFAULT 4,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preload_enabled boolean DEFAULT true,
  old_device_optimization boolean DEFAULT true,
  smart_memory_system boolean DEFAULT true,
  dark_mode_support boolean DEFAULT true,
  lazy_loading boolean DEFAULT true,
  cache_strategy text DEFAULT 'aggressive',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core_ai_general (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_behavior_analysis boolean DEFAULT true,
  general_recommendations boolean DEFAULT true,
  load_balance boolean DEFAULT true,
  auto_optimization boolean DEFAULT false,
  learning_mode text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- 🟩 MODULE LAYER - طبقة المزادات العامة
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public_section_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text DEFAULT 'public',
  display_name text DEFAULT 'المزادات العامة',
  is_active boolean DEFAULT true,
  layout_mode text DEFAULT 'grid',
  items_per_page integer DEFAULT 20,
  enable_search boolean DEFAULT true,
  enable_sorting boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_sliders_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slider_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  order_index integer DEFAULT 0,
  spacing integer DEFAULT 4,
  speed text DEFAULT 'normal',
  visible_items integer DEFAULT 4,
  active_style jsonb DEFAULT '{"border": true, "scale": 1.05, "shadow": true}',
  allow_multiple_selection boolean DEFAULT false,
  dynamic_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(slider_name)
);

CREATE TABLE IF NOT EXISTS public_filters_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_name text NOT NULL UNIQUE,
  filter_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  order_index integer DEFAULT 0,
  filter_options jsonb DEFAULT '{}',
  is_predictive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_seller_tools_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text NOT NULL,
  tool_key text NOT NULL UNIQUE,
  description text,
  available_for_free boolean DEFAULT false,
  available_for_silver boolean DEFAULT false,
  available_for_gold boolean DEFAULT false,
  is_ai_powered boolean DEFAULT false,
  tool_category text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_regions_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dynamic_system_enabled boolean DEFAULT true,
  display_mode text DEFAULT 'slider',
  allow_multiple_cities boolean DEFAULT true,
  hide_low_activity_cities boolean DEFAULT false,
  highlight_high_activity boolean DEFAULT true,
  auto_sort_by_activity boolean DEFAULT false,
  min_activity_threshold integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_ui_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_size text DEFAULT 'medium',
  rows_display text DEFAULT 'single',
  show_badges boolean DEFAULT true,
  badge_new_enabled boolean DEFAULT true,
  badge_ending_soon_enabled boolean DEFAULT true,
  badge_sold_enabled boolean DEFAULT true,
  dark_mode_enabled boolean DEFAULT false,
  mobile_font_scale real DEFAULT 1.0,
  show_bid_count boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_type text NOT NULL,
  stat_value jsonb NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id),
  action_type text NOT NULL,
  action_details jsonb NOT NULL,
  before_state jsonb,
  after_state jsonb,
  impact_analysis jsonb,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- 🟨 AI LAYER - طبقة الذكاء الصناعي المخصص
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  insight_data jsonb NOT NULL,
  confidence_score real DEFAULT 0.0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type text NOT NULL,
  recommendation_title text NOT NULL,
  recommendation_details jsonb NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  confidence_score real DEFAULT 0.0,
  expected_impact jsonb,
  created_at timestamptz DEFAULT now(),
  applied_at timestamptz
);

CREATE TABLE IF NOT EXISTS public_ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  alert_title text NOT NULL,
  alert_message text NOT NULL,
  severity text DEFAULT 'info',
  is_read boolean DEFAULT false,
  action_required boolean DEFAULT false,
  action_suggestion jsonb,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- ═══════════════════════════════════════════════════════════
-- إدراج البيانات الأولية
-- ═══════════════════════════════════════════════════════════

INSERT INTO core_slider_base (animation_type, default_speed, active_effect, default_card_size, swipe_engine, baseline_spacing)
VALUES ('smooth', 'normal', 'scale', 'medium', 'standard', 4)
ON CONFLICT DO NOTHING;

INSERT INTO core_performance (preload_enabled, old_device_optimization, smart_memory_system, dark_mode_support)
VALUES (true, true, true, true)
ON CONFLICT DO NOTHING;

INSERT INTO core_ai_general (visitor_behavior_analysis, general_recommendations, load_balance, learning_mode)
VALUES (true, true, true, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public_section_settings (section_key, display_name, is_active, layout_mode)
VALUES ('public', 'المزادات العامة', true, 'grid')
ON CONFLICT DO NOTHING;

INSERT INTO public_sliders_config (slider_name, is_enabled, order_index, spacing, speed, visible_items, dynamic_enabled) VALUES
('regions', true, 1, 4, 'normal', 6, true),
('cities', true, 2, 4, 'normal', 8, true),
('categories', true, 3, 4, 'normal', 6, false)
ON CONFLICT (slider_name) DO NOTHING;

INSERT INTO public_filters_config (filter_name, filter_type, is_enabled, order_index) VALUES
('region', 'region', true, 1),
('city', 'city', true, 2),
('category', 'category', true, 3),
('price', 'price', true, 4),
('time_remaining', 'time', true, 5),
('status', 'status', true, 6)
ON CONFLICT (filter_name) DO NOTHING;

INSERT INTO public_seller_tools_config (tool_name, tool_key, available_for_free, available_for_silver, available_for_gold, is_ai_powered, tool_category) VALUES
('إغلاق المزاد', 'close_auction', true, true, true, false, 'basic'),
('تم البيع', 'mark_sold', true, true, true, false, 'basic'),
('تعديل بسيط', 'basic_edit', true, true, true, false, 'basic'),
('إعادة نشر بعد 24 ساعة', 'repost_24h', true, true, true, false, 'basic'),
('تمديد المزاد', 'extend', false, true, true, false, 'advanced'),
('قرب انتهاء', 'ending_soon', false, true, true, false, 'advanced'),
('تعديل كامل', 'full_edit', false, true, true, false, 'advanced'),
('إعادة نشر فوري', 'instant_repost', false, true, true, false, 'advanced'),
('المساعد الذكي', 'ai_assistant', false, false, true, true, 'ai')
ON CONFLICT (tool_key) DO NOTHING;

INSERT INTO public_regions_settings (dynamic_system_enabled, display_mode, allow_multiple_cities)
VALUES (true, 'dynamic', true)
ON CONFLICT DO NOTHING;

INSERT INTO public_ui_settings (card_size, rows_display, show_badges, dark_mode_enabled)
VALUES ('medium', 'single', true, false)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════

ALTER TABLE core_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_slider_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_ai_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_section_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_sliders_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_filters_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_seller_tools_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_regions_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ui_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_alerts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  CREATE POLICY "Admins only - core_settings" ON core_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - core_slider_base" ON core_slider_base FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - core_performance" ON core_performance FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - core_ai_general" ON core_ai_general FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_section_settings" ON public_section_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_sliders_config" ON public_sliders_config FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_filters_config" ON public_filters_config FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_seller_tools_config" ON public_seller_tools_config FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_regions_settings" ON public_regions_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_ui_settings" ON public_ui_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_statistics" ON public_statistics FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_activity_logs" ON public_activity_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_ai_insights" ON public_ai_insights FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_ai_recommendations" ON public_ai_recommendations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
  CREATE POLICY "Admins only - public_ai_alerts" ON public_ai_alerts FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_public_sliders_enabled ON public_sliders_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_public_filters_enabled ON public_filters_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_public_statistics_type ON public_statistics(stat_type);
CREATE INDEX IF NOT EXISTS idx_public_ai_recommendations_status ON public_ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_public_ai_alerts_read ON public_ai_alerts(is_read);
