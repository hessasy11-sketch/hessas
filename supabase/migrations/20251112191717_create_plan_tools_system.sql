/*
  # إنشاء نظام أدوات الباقات الذكية

  1. جداول جديدة
    - `plan_tools` - الأدوات المتاحة لكل باقة
    - `plan_tool_categories` - تصنيفات الأدوات
    - `plan_subscribers` - عدد المشتركين في كل باقة

  2. البيانات الافتراضية
    - إدراج الأدوات الأساسية لكل باقة

  3. الأمان
    - تفعيل RLS على جميع الجداول
*/

-- جدول تصنيفات الأدوات
CREATE TABLE IF NOT EXISTS plan_tool_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- جدول أدوات الباقات
CREATE TABLE IF NOT EXISTS plan_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES plan_tool_categories(id),
  tool_key text UNIQUE NOT NULL,
  tool_name text NOT NULL,
  tool_name_ar text NOT NULL,
  description text,
  description_ar text,
  available_in_free boolean DEFAULT false,
  available_in_silver boolean DEFAULT false,
  available_in_gold boolean DEFAULT false,
  is_active boolean DEFAULT true,
  requires_ai boolean DEFAULT false,
  access_level text[] DEFAULT ARRAY['seller'],
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- جدول المشتركين في الباقات
CREATE TABLE IF NOT EXISTS plan_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  subscribed_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE plan_tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subscribers ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة
CREATE POLICY "Anyone can view tool categories"
  ON plan_tool_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view plan tools"
  ON plan_tools FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own subscriptions"
  ON plan_subscribers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- إدراج تصنيفات الأدوات
INSERT INTO plan_tool_categories (name, name_ar, display_order) VALUES
  ('Basic Operations', 'العمليات الأساسية', 1),
  ('Advanced Features', 'الميزات المتقدمة', 2),
  ('AI Features', 'ميزات الذكاء الصناعي', 3)
ON CONFLICT DO NOTHING;

-- الحصول على IDs التصنيفات
DO $$
DECLARE
  basic_cat_id uuid;
  advanced_cat_id uuid;
  ai_cat_id uuid;
BEGIN
  SELECT id INTO basic_cat_id FROM plan_tool_categories WHERE name = 'Basic Operations';
  SELECT id INTO advanced_cat_id FROM plan_tool_categories WHERE name = 'Advanced Features';
  SELECT id INTO ai_cat_id FROM plan_tool_categories WHERE name = 'AI Features';

  -- إدراج الأدوات الأساسية (متاحة في جميع الباقات)
  INSERT INTO plan_tools (category_id, tool_key, tool_name, tool_name_ar, description_ar, available_in_free, available_in_silver, available_in_gold, access_level) VALUES
    (basic_cat_id, 'create_auction', 'Create Auction', 'إنشاء المزاد', 'إنشاء مزاد جديد بالبيانات الأساسية', true, true, true, ARRAY['seller']),
    (basic_cat_id, 'edit_auction', 'Edit Auction', 'تعديل المزاد', 'تعديل بيانات المزاد قبل انتهائه', true, true, true, ARRAY['seller']),
    (basic_cat_id, 'mark_sold', 'Mark as Sold', 'تم البيع', 'تحديد المزاد كمباع', true, true, true, ARRAY['seller']),
    (basic_cat_id, 'close_auction', 'Close Auction', 'إغلاق المزاد', 'إغلاق المزاد مبكراً', true, true, true, ARRAY['seller'])
  ON CONFLICT (tool_key) DO NOTHING;

  -- إدراج الأدوات المتقدمة (فضية وذهبية)
  INSERT INTO plan_tools (category_id, tool_key, tool_name, tool_name_ar, description_ar, available_in_free, available_in_silver, available_in_gold, access_level) VALUES
    (advanced_cat_id, 'extend_auction', 'Extend Auction', 'تمديد المزاد', 'تمديد وقت المزاد لفترة إضافية', false, true, true, ARRAY['seller']),
    (advanced_cat_id, 'auto_republish', 'Auto Republish', 'إعادة نشر تلقائي', 'إعادة نشر المزاد تلقائياً إذا لم يباع', false, true, true, ARRAY['seller']),
    (advanced_cat_id, 'sale_indicators', 'Sale Indicators', 'إشارات البيع', 'مؤشرات ذكية لتوقيت أفضل للبيع', false, true, true, ARRAY['seller']),
    (advanced_cat_id, 'advanced_analytics', 'Advanced Analytics', 'تحليلات متقدمة', 'إحصائيات وتقارير تفصيلية', false, true, true, ARRAY['seller'])
  ON CONFLICT (tool_key) DO NOTHING;

  -- إدراج ميزات الذكاء الصناعي (ذهبية فقط)
  INSERT INTO plan_tools (category_id, tool_key, tool_name, tool_name_ar, description_ar, available_in_free, available_in_silver, available_in_gold, requires_ai, access_level) VALUES
    (ai_cat_id, 'smart_assistant', 'Smart AI Assistant', 'المساعد الذكي', 'مساعد ذكي للرد على الاستفسارات وإدارة المزاد', false, false, true, true, ARRAY['seller', 'buyer']),
    (ai_cat_id, 'performance_analysis', 'Performance Analysis', 'تحليل الأداء', 'تحليل ذكي لأداء المزاد وتوصيات التحسين', false, false, true, true, ARRAY['seller']),
    (ai_cat_id, 'price_prediction', 'Price Prediction', 'توقع السعر', 'توقع السعر النهائي بناءً على البيانات', false, false, true, true, ARRAY['seller']),
    (ai_cat_id, 'auto_responses', 'Auto Responses', 'ردود تلقائية', 'ردود ذكية تلقائية على الأسئلة الشائعة', false, false, true, true, ARRAY['seller'])
  ON CONFLICT (tool_key) DO NOTHING;
END $$;

-- دالة لحساب عدد المشتركين في باقة معينة
CREATE OR REPLACE FUNCTION get_plan_subscribers_count(plan_type_param text)
RETURNS integer AS $$
DECLARE
  count_result integer;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM plan_subscribers
  WHERE plan_type = plan_type_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتفعيل/تعطيل أداة
CREATE OR REPLACE FUNCTION toggle_plan_tool(tool_key_param text, is_active_param boolean)
RETURNS boolean AS $$
BEGIN
  UPDATE plan_tools
  SET is_active = is_active_param
  WHERE tool_key = tool_key_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;