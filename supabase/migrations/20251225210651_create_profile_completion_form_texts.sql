/*
  # نظام نصوص نموذج استكمال البيانات الاستثمارية

  1. جدول جديد
    - `b2f_profile_completion_texts`
      - نصوص قابلة للتعديل من لوحة الإدارة
      - تشمل: عناوين الحقول، الأوصاف، خيارات القوائم، رسائل التأكيد

  2. الأمان
    - تفعيل RLS
    - الجميع يمكنهم القراءة
    - الإدارة فقط يمكنها التعديل
*/

-- إنشاء جدول نصوص نموذج الاستكمال
CREATE TABLE IF NOT EXISTS b2f_profile_completion_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_key text NOT NULL UNIQUE,
  text_value text NOT NULL,
  text_category text NOT NULL CHECK (text_category IN 
    ('page_header', 'field_label', 'field_description', 'option', 'button', 'message', 'validation')),
  field_name text DEFAULT '',
  display_order int DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_profile_completion_texts ENABLE ROW LEVEL SECURITY;

-- الجميع يمكنهم القراءة
CREATE POLICY "Anyone can read profile completion texts"
  ON b2f_profile_completion_texts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- الإدارة فقط يمكنها التعديل
CREATE POLICY "Authenticated users can update profile completion texts"
  ON b2f_profile_completion_texts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert profile completion texts"
  ON b2f_profile_completion_texts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_profile_completion_texts_key
  ON b2f_profile_completion_texts(text_key);

CREATE INDEX IF NOT EXISTS idx_profile_completion_texts_category
  ON b2f_profile_completion_texts(text_category);

CREATE INDEX IF NOT EXISTS idx_profile_completion_texts_field
  ON b2f_profile_completion_texts(field_name);

-- وظيفة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_profile_completion_texts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_b2f_profile_completion_texts_updated_at_trigger ON b2f_profile_completion_texts;
CREATE TRIGGER update_b2f_profile_completion_texts_updated_at_trigger
  BEFORE UPDATE ON b2f_profile_completion_texts
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_profile_completion_texts_updated_at();

-- إدراج النصوص الافتراضية
INSERT INTO b2f_profile_completion_texts (text_key, text_value, text_category, field_name, display_order, description) VALUES
  -- Page Header
  ('page_title', 'استكمال بيانات حسابك الاستثماري', 'page_header', '', 1, 'عنوان الصفحة'),
  ('page_subtitle', 'أكمل المعلومات التالية لتفعيل حسابك الاستثماري بالكامل', 'page_header', '', 2, 'العنوان الفرعي'),
  ('page_description', 'هذه البيانات تساعدنا على تقديم خدمة أفضل وعروض استثمارية مناسبة لك', 'page_header', '', 3, 'وصف الصفحة'),
  
  -- City/Region Fields
  ('label_city', 'المدينة', 'field_label', 'city', 10, 'عنوان حقل المدينة'),
  ('desc_city', 'اختر المدينة التي تقيم فيها', 'field_description', 'city', 11, 'وصف حقل المدينة'),
  ('label_region', 'المنطقة', 'field_label', 'region', 12, 'عنوان حقل المنطقة'),
  ('desc_region', 'اختر المنطقة الإدارية', 'field_description', 'region', 13, 'وصف حقل المنطقة'),
  
  -- Investor Type
  ('label_investor_type', 'نوع المستثمر', 'field_label', 'investor_type', 20, 'عنوان حقل نوع المستثمر'),
  ('desc_investor_type', 'حدد نوع حسابك الاستثماري', 'field_description', 'investor_type', 21, 'وصف حقل نوع المستثمر'),
  ('option_investor_individual', 'فرد', 'option', 'investor_type', 22, 'خيار: فرد'),
  ('option_investor_company', 'مؤسسة / شركة', 'option', 'investor_type', 23, 'خيار: مؤسسة'),
  
  -- Investment Purpose
  ('label_investment_purpose', 'الصفة الاستثمارية', 'field_label', 'investment_purpose', 30, 'عنوان حقل الصفة الاستثمارية'),
  ('desc_investment_purpose', 'ما هو الهدف من استثمارك؟', 'field_description', 'investment_purpose', 31, 'وصف حقل الصفة'),
  ('option_purpose_personal', 'استثمار شخصي', 'option', 'investment_purpose', 32, 'خيار: شخصي'),
  ('option_purpose_family', 'استثمار عائلي', 'option', 'investment_purpose', 33, 'خيار: عائلي'),
  ('option_purpose_organization', 'استثمار لمؤسسة', 'option', 'investment_purpose', 34, 'خيار: مؤسسة'),
  
  -- Preferred Contact Method
  ('label_contact_method', 'قناة التواصل المفضلة', 'field_label', 'contact_method', 40, 'عنوان حقل قناة التواصل'),
  ('desc_contact_method', 'كيف تفضل أن نتواصل معك؟', 'field_description', 'contact_method', 41, 'وصف حقل قناة التواصل'),
  ('option_contact_whatsapp', 'واتساب', 'option', 'contact_method', 42, 'خيار: واتساب'),
  ('option_contact_call', 'اتصال هاتفي', 'option', 'contact_method', 43, 'خيار: اتصال'),
  ('option_contact_email', 'بريد إلكتروني', 'option', 'contact_method', 44, 'خيار: بريد'),
  
  -- Email Field
  ('label_email', 'البريد الإلكتروني (اختياري)', 'field_label', 'email', 50, 'عنوان حقل البريد'),
  ('desc_email', 'يمكنك إضافة بريدك الإلكتروني للتواصل الرسمي', 'field_description', 'email', 51, 'وصف حقل البريد'),
  ('placeholder_email', 'example@email.com', 'field_description', 'email', 52, 'نص توضيحي لحقل البريد'),
  
  -- Notes Field
  ('label_notes', 'ملاحظات إضافية (اختياري)', 'field_label', 'notes', 60, 'عنوان حقل الملاحظات'),
  ('desc_notes', 'أي تفاصيل أخرى تود إضافتها', 'field_description', 'notes', 61, 'وصف حقل الملاحظات'),
  ('placeholder_notes', 'اكتب ملاحظاتك هنا...', 'field_description', 'notes', 62, 'نص توضيحي لحقل الملاحظات'),
  
  -- Buttons
  ('btn_save', 'حفظ بيانات الحساب', 'button', '', 70, 'نص زر الحفظ'),
  ('btn_cancel', 'إلغاء', 'button', '', 71, 'نص زر الإلغاء'),
  ('btn_back', 'عودة', 'button', '', 72, 'نص زر العودة'),
  
  -- Messages
  ('msg_success', 'تم حفظ بياناتك بنجاح! حسابك الآن مكتمل وجاهز.', 'message', '', 80, 'رسالة النجاح'),
  ('msg_error', 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.', 'message', '', 81, 'رسالة الخطأ'),
  ('msg_profile_complete', 'حسابك الاستثماري جاهز للعقود المستقبلية', 'message', '', 82, 'رسالة اكتمال الحساب'),
  
  -- Validation
  ('validation_city_required', 'يرجى اختيار المدينة', 'validation', 'city', 90, 'رسالة تحقق المدينة'),
  ('validation_region_required', 'يرجى اختيار المنطقة', 'validation', 'region', 91, 'رسالة تحقق المنطقة'),
  ('validation_investor_type_required', 'يرجى اختيار نوع المستثمر', 'validation', 'investor_type', 92, 'رسالة تحقق نوع المستثمر'),
  ('validation_purpose_required', 'يرجى اختيار الصفة الاستثمارية', 'validation', 'investment_purpose', 93, 'رسالة تحقق الصفة'),
  ('validation_contact_required', 'يرجى اختيار قناة التواصل المفضلة', 'validation', 'contact_method', 94, 'رسالة تحقق قناة التواصل'),
  ('validation_email_invalid', 'البريد الإلكتروني غير صالح', 'validation', 'email', 95, 'رسالة تحقق البريد')
ON CONFLICT (text_key) DO NOTHING;
