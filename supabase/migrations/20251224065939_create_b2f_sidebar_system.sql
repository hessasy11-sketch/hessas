/*
  # إنشاء نظام الشريط الجانبي المستقل لقسم استثمار أشجار المزارع (B2F)
  
  1. جداول جديدة
    - `b2f_sidebar_config` - إعدادات الشريط الجانبي الرئيسية
      - `id` (uuid, primary key)
      - `section_name` (text) - اسم القسم
      - `description` (text) - وصف القسم
      - `note` (text) - ملاحظة هامة
      - `is_active` (boolean) - حالة التفعيل
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `b2f_sidebar_items` - عناصر الشريط الجانبي
      - `id` (uuid, primary key)
      - `label` (text) - النص المعروض
      - `icon` (text) - اسم الأيقونة
      - `action` (text) - الإجراء عند النقر
      - `display_order` (integer) - ترتيب العرض
      - `is_active` (boolean) - حالة التفعيل
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. الأمان
    - تفعيل RLS على جميع الجداول
    - السماح للجميع بالقراءة (قسم عام)
    - السماح للمستخدمين المصادق عليهم بالتعديل
  
  3. البيانات الأولية
    - إضافة الإعدادات الافتراضية
    - إضافة عناصر الشريط الجانبي الأساسية
*/

-- إنشاء جدول إعدادات الشريط الجانبي
CREATE TABLE IF NOT EXISTS b2f_sidebar_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name text NOT NULL DEFAULT 'استثمار أشجار المزارع',
  description text,
  note text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول عناصر الشريط الجانبي
CREATE TABLE IF NOT EXISTS b2f_sidebar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  icon text NOT NULL,
  action text NOT NULL,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_sidebar_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_sidebar_items ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة للجميع (قسم عام)
CREATE POLICY "Anyone can read B2F sidebar config"
  ON b2f_sidebar_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read B2F sidebar items"
  ON b2f_sidebar_items FOR SELECT
  USING (is_active = true);

-- سياسات التعديل للمستخدمين المصادق عليهم فقط
CREATE POLICY "Authenticated users can manage B2F sidebar config"
  ON b2f_sidebar_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage B2F sidebar items"
  ON b2f_sidebar_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_sidebar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_b2f_sidebar_config_updated_at
  BEFORE UPDATE ON b2f_sidebar_config
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_sidebar_updated_at();

CREATE TRIGGER update_b2f_sidebar_items_updated_at
  BEFORE UPDATE ON b2f_sidebar_items
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_sidebar_updated_at();

-- إدراج البيانات الأولية للإعدادات
INSERT INTO b2f_sidebar_config (section_name, description, note)
VALUES (
  'استثمار أشجار المزارع',
  'نظام متكامل لاستئجار وامتلاك الأشجار المثمرة',
  'لا يوجد مزايدة - حجز مباشر فقط'
);

-- إدراج عناصر الشريط الجانبي
INSERT INTO b2f_sidebar_items (label, icon, action, display_order) VALUES
  ('نبذة عن الاستئجار', 'Info', 'info', 1),
  ('حالة المشاريع', 'BarChart3', 'status', 2),
  ('ملاحظة هامة', 'AlertCircle', 'note', 3);

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_b2f_sidebar_items_display_order 
  ON b2f_sidebar_items(display_order) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_b2f_sidebar_items_active 
  ON b2f_sidebar_items(is_active);

-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE b2f_sidebar_config;
ALTER PUBLICATION supabase_realtime ADD TABLE b2f_sidebar_items;