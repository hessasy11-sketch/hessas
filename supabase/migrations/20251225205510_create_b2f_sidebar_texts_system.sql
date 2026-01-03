/*
  # نظام النصوص القابلة للتعديل للشريط الجانبي B2F

  1. جدول جديد
    - `b2f_sidebar_texts`
      - نصوص قابلة للتعديل من لوحة الإدارة
      - تشمل: عنوان الشريط، الوصف، حالات الطلبات، مسار التقدم

  2. الأمان
    - تفعيل RLS
    - الجميع يمكنهم القراءة
    - الإدارة فقط يمكنها التعديل
*/

-- إنشاء جدول النصوص
CREATE TABLE IF NOT EXISTS b2f_sidebar_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_key text NOT NULL UNIQUE,
  text_value text NOT NULL,
  text_category text NOT NULL CHECK (text_category IN ('header', 'status', 'progress', 'profile', 'general')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_sidebar_texts ENABLE ROW LEVEL SECURITY;

-- الجميع يمكنهم القراءة
CREATE POLICY "Anyone can read sidebar texts"
  ON b2f_sidebar_texts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- الإدارة فقط يمكنها التعديل
CREATE POLICY "Authenticated users can update sidebar texts"
  ON b2f_sidebar_texts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert sidebar texts"
  ON b2f_sidebar_texts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS idx_sidebar_texts_key
  ON b2f_sidebar_texts(text_key);

CREATE INDEX IF NOT EXISTS idx_sidebar_texts_category
  ON b2f_sidebar_texts(text_category);

-- وظيفة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_sidebar_texts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_b2f_sidebar_texts_updated_at_trigger ON b2f_sidebar_texts;
CREATE TRIGGER update_b2f_sidebar_texts_updated_at_trigger
  BEFORE UPDATE ON b2f_sidebar_texts
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_sidebar_texts_updated_at();

-- إدراج النصوص الافتراضية
INSERT INTO b2f_sidebar_texts (text_key, text_value, text_category, description) VALUES
  -- Header texts
  ('sidebar_title', 'حسابي الاستثماري', 'header', 'عنوان الشريط الجانبي'),
  ('account_welcome', 'هذا حسابك الاستثماري في استثمار أشجار المزارع.', 'header', 'النص الترحيبي'),
  ('profile_incomplete', 'باقي استكمال بياناتك', 'profile', 'نص عندما البيانات ناقصة'),
  ('profile_complete', 'بياناتك مكتملة وجاهزة للعقود.', 'profile', 'نص عندما البيانات مكتملة'),
  ('my_requests_title', 'طلباتي الاستثمارية', 'header', 'عنوان قسم الطلبات'),
  ('no_requests', 'لا توجد طلبات استثمارية حتى الآن', 'general', 'رسالة عدم وجود طلبات'),
  
  -- Status texts
  ('status_new_desc', 'طلبك الآن قيد مراجعة فريق الاستثمار.', 'status', 'وصف حالة جديد'),
  ('status_pending_desc', 'نحن نراجع تفاصيل طلبك الاستثماري.', 'status', 'وصف حالة قيد المراجعة'),
  ('status_contacted_desc', 'تم التواصل معك، بانتظار ردك.', 'status', 'وصف حالة تم التواصل'),
  ('status_completed_desc', 'تم استكمال طلبك بنجاح.', 'status', 'وصف حالة مكتمل'),
  ('status_cancelled_desc', 'تم إلغاء هذا الطلب.', 'status', 'وصف حالة ملغي'),
  
  -- Progress steps
  ('progress_step_1', 'استلمنا طلبك', 'progress', 'المرحلة 1 من مسار الطلب'),
  ('progress_step_2', 'نراجع التفاصيل', 'progress', 'المرحلة 2 من مسار الطلب'),
  ('progress_step_3', 'تواصلنا معك', 'progress', 'المرحلة 3 من مسار الطلب'),
  ('progress_step_4', 'في انتظار قرارك', 'progress', 'المرحلة 4 من مسار الطلب'),
  ('progress_step_5', 'حجز مبدئي', 'progress', 'المرحلة 5 من مسار الطلب')
ON CONFLICT (text_key) DO NOTHING;
