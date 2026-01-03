/*
  # نظام العقود والدفع اليدوي - المرحلة العاشرة

  1. جداول جديدة
    - `b2f_contracts` - عقود الاستثمار
    - `b2f_payment_receipts` - إيصالات الدفع المرفوعة
    - `b2f_contract_texts` - نصوص العقود القابلة للتعديل
    - `b2f_payment_page_texts` - نصوص صفحة الدفع
    - `b2f_bank_account_info` - معلومات الحساب البنكي

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات وصول مناسبة لكل جدول
    - المستثمر يرى عقوده فقط
    - الإدارة ترى كل شيء

  3. الوظائف
    - دالة إنشاء عقد من طلب استثمار
    - دالة حساب مبلغ العقد
    - دالة تحديث حالة العقد
*/

-- ================================================
-- 1. جدول العقود الاستثمارية
-- ================================================

CREATE TABLE IF NOT EXISTS b2f_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL DEFAULT '',
  
  -- ارتباطات
  investor_account_id uuid NOT NULL REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  intent_request_id uuid REFERENCES investor_intent_requests(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES investment_opportunities(id) ON DELETE SET NULL,
  
  -- بيانات العقد
  tree_quantity int NOT NULL DEFAULT 1,
  price_per_tree decimal NOT NULL,
  total_amount decimal NOT NULL,
  contract_duration_years int NOT NULL DEFAULT 10,
  
  -- حالة العقد
  contract_status text NOT NULL DEFAULT 'draft' CHECK (contract_status IN (
    'draft',                    -- مسودة
    'sent_to_investor',         -- مرسل للمستثمر - بانتظار الدفع
    'payment_pending',          -- بانتظار رفع الإيصال
    'payment_uploaded',         -- تم رفع الإيصال - بانتظار التحقق
    'payment_verified',         -- تم التحقق من الدفع
    'active',                   -- ساري
    'completed',                -- مكتمل
    'cancelled',                -- ملغي
    'suspended'                 -- معلق
  )),
  
  -- نص العقد
  contract_terms text,
  special_notes text,
  
  -- التواريخ
  contract_start_date timestamptz,
  contract_end_date timestamptz,
  
  -- معلومات إضافية
  opportunity_snapshot jsonb,  -- نسخة من بيانات العرض وقت العقد
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- التحقق
  CONSTRAINT valid_tree_quantity CHECK (tree_quantity > 0),
  CONSTRAINT valid_amounts CHECK (price_per_tree > 0 AND total_amount > 0)
);

-- إنشاء sequence لرقم العقد
CREATE SEQUENCE IF NOT EXISTS b2f_contract_number_seq START 1000;

-- دالة لتوليد رقم عقد فريد
CREATE OR REPLACE FUNCTION generate_b2f_contract_number()
RETURNS text AS $$
BEGIN
  RETURN 'B2F-CNT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('b2f_contract_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger لتوليد رقم العقد تلقائياً
CREATE OR REPLACE FUNCTION set_b2f_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := generate_b2f_contract_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_b2f_contract_number_trigger ON b2f_contracts;
CREATE TRIGGER set_b2f_contract_number_trigger
  BEFORE INSERT ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION set_b2f_contract_number();

-- ================================================
-- 2. جدول إيصالات الدفع
-- ================================================

CREATE TABLE IF NOT EXISTS b2f_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباطات
  contract_id uuid NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  investor_account_id uuid NOT NULL REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  
  -- ملف الإيصال
  receipt_file_url text NOT NULL,
  receipt_file_name text,
  receipt_file_size int,
  
  -- بيانات المستثمر
  transfer_date date,
  investor_notes text,
  
  -- نتائج الذكاء الصناعي
  ai_detected_amount decimal,
  ai_detected_date date,
  ai_match_score decimal,  -- 0-100
  ai_analysis_result jsonb,
  ai_notes text,
  
  -- حالة المراجعة
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending',              -- بانتظار المراجعة
    'under_review',         -- قيد المراجعة
    'approved',             -- موافق عليه
    'rejected',             -- مرفوض
    'reupload_requested'    -- مطلوب إعادة رفع
  )),
  
  -- مراجعة الإدارة
  admin_notes text,
  admin_reviewed_by uuid,
  admin_reviewed_at timestamptz,
  rejection_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- 3. جدول نصوص العقود
-- ================================================

CREATE TABLE IF NOT EXISTS b2f_contract_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_key text NOT NULL UNIQUE,
  text_value text NOT NULL,
  text_category text NOT NULL CHECK (text_category IN (
    'contract_header',
    'contract_terms',
    'contract_clause',
    'contract_footer',
    'button',
    'message',
    'label'
  )),
  display_order int DEFAULT 0,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- 4. جدول نصوص صفحة الدفع
-- ================================================

CREATE TABLE IF NOT EXISTS b2f_payment_page_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_key text NOT NULL UNIQUE,
  text_value text NOT NULL,
  text_category text NOT NULL CHECK (text_category IN (
    'page_header',
    'contract_info',
    'payment_info',
    'bank_details',
    'upload_section',
    'button',
    'message',
    'warning'
  )),
  display_order int DEFAULT 0,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- 5. جدول معلومات الحساب البنكي
-- ================================================

CREATE TABLE IF NOT EXISTS b2f_bank_account_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  iban text NOT NULL,
  swift_code text,
  bank_branch text,
  additional_notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- إنشاء الفهارس
-- ================================================

CREATE INDEX IF NOT EXISTS idx_contracts_investor ON b2f_contracts(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON b2f_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_contracts_number ON b2f_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_intent_request ON b2f_contracts(intent_request_id);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_contract ON b2f_payment_receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_investor ON b2f_payment_receipts(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_status ON b2f_payment_receipts(review_status);

CREATE INDEX IF NOT EXISTS idx_contract_texts_key ON b2f_contract_texts(text_key);
CREATE INDEX IF NOT EXISTS idx_contract_texts_category ON b2f_contract_texts(text_category);

CREATE INDEX IF NOT EXISTS idx_payment_texts_key ON b2f_payment_page_texts(text_key);
CREATE INDEX IF NOT EXISTS idx_payment_texts_category ON b2f_payment_page_texts(text_category);

-- ================================================
-- تفعيل RLS
-- ================================================

ALTER TABLE b2f_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_contract_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_payment_page_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_bank_account_info ENABLE ROW LEVEL SECURITY;

-- ================================================
-- سياسات RLS - العقود
-- ================================================

CREATE POLICY "Anyone can view contracts"
  ON b2f_contracts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage contracts"
  ON b2f_contracts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ================================================
-- سياسات RLS - الإيصالات
-- ================================================

CREATE POLICY "Anyone can view receipts"
  ON b2f_payment_receipts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert receipts"
  ON b2f_payment_receipts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage receipts"
  ON b2f_payment_receipts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ================================================
-- سياسات RLS - النصوص
-- ================================================

CREATE POLICY "Anyone can read contract texts"
  ON b2f_contract_texts
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage contract texts"
  ON b2f_contract_texts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read payment page texts"
  ON b2f_payment_page_texts
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage payment texts"
  ON b2f_payment_page_texts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ================================================
-- سياسات RLS - معلومات البنك
-- ================================================

CREATE POLICY "Anyone can read active bank info"
  ON b2f_bank_account_info
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage bank info"
  ON b2f_bank_account_info
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ================================================
-- Triggers لتحديث updated_at
-- ================================================

CREATE OR REPLACE FUNCTION update_b2f_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_b2f_contracts_updated_at_trigger ON b2f_contracts;
CREATE TRIGGER update_b2f_contracts_updated_at_trigger
  BEFORE UPDATE ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_contracts_updated_at();

CREATE OR REPLACE FUNCTION update_b2f_payment_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_b2f_payment_receipts_updated_at_trigger ON b2f_payment_receipts;
CREATE TRIGGER update_b2f_payment_receipts_updated_at_trigger
  BEFORE UPDATE ON b2f_payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_payment_receipts_updated_at();

-- ================================================
-- إدراج البيانات الافتراضية
-- ================================================

-- نصوص العقود
INSERT INTO b2f_contract_texts (text_key, text_value, text_category, display_order, description) VALUES
  ('contract_title', 'عقد استثمار أشجار المزارع', 'contract_header', 1, 'عنوان العقد'),
  ('contract_intro', 'بسم الله الرحمن الرحيم\n\nهذا عقد استثمار في أشجار المزارع بين المنصة والمستثمر', 'contract_header', 2, 'مقدمة العقد'),
  
  ('clause_parties', 'الأطراف المتعاقدة', 'contract_clause', 10, 'عنوان بند الأطراف'),
  ('clause_parties_text', 'الطرف الأول: منصة استثمار أشجار المزارع\nالطرف الثاني: المستثمر', 'contract_clause', 11, 'نص بند الأطراف'),
  
  ('clause_subject', 'موضوع العقد', 'contract_clause', 20, 'عنوان بند الموضوع'),
  ('clause_subject_text', 'يتعلق هذا العقد باستثمار عدد محدد من الأشجار لمدة محددة مع توضيح الحقوق والالتزامات', 'contract_clause', 21, 'نص بند الموضوع'),
  
  ('clause_duration', 'مدة العقد', 'contract_clause', 30, 'عنوان بند المدة'),
  ('clause_amount', 'المبلغ الإجمالي', 'contract_clause', 40, 'عنوان بند المبلغ'),
  
  ('clause_rights', 'حقوق والتزامات المستثمر', 'contract_clause', 50, 'عنوان بند الحقوق'),
  ('clause_rights_text', '- يحق للمستثمر متابعة استثماره\n- يلتزم المستثمر بدفع المبلغ المتفق عليه\n- يحق للمستثمر الحصول على تقارير دورية', 'contract_clause', 51, 'نص بند الحقوق'),
  
  ('contract_footer', 'تم إعداد هذا العقد بتاريخ {date} ويسري لمدة {duration} سنوات', 'contract_footer', 100, 'تذييل العقد'),
  
  ('btn_accept', 'أوافق على بنود العقد', 'button', 200, 'زر الموافقة'),
  ('btn_proceed_payment', 'متابعة للدفع', 'button', 201, 'زر متابعة الدفع')
ON CONFLICT (text_key) DO NOTHING;

-- نصوص صفحة الدفع
INSERT INTO b2f_payment_page_texts (text_key, text_value, text_category, display_order, description) VALUES
  ('page_title', 'إكمال التعاقد والدفع', 'page_header', 1, 'عنوان الصفحة'),
  ('page_subtitle', 'اتبع الخطوات التالية لإتمام عقدك الاستثماري', 'page_header', 2, 'العنوان الفرعي'),
  
  ('contract_number_label', 'رقم العقد', 'contract_info', 10, 'تسمية رقم العقد'),
  ('investor_name_label', 'اسم المستثمر', 'contract_info', 11, 'تسمية اسم المستثمر'),
  ('investment_type_label', 'نوع الاستثمار', 'contract_info', 12, 'تسمية نوع الاستثمار'),
  
  ('total_amount_label', 'المبلغ الإجمالي', 'payment_info', 20, 'تسمية المبلغ'),
  ('contract_duration_label', 'مدة العقد', 'payment_info', 21, 'تسمية المدة'),
  ('important_note', '⚠️ هذا المبلغ يمثل قيمة الاستثمار لمدة {duration} سنوات كاملة، وليس مبلغًا سنويًا', 'payment_info', 22, 'ملاحظة مهمة'),
  
  ('bank_details_title', 'بيانات التحويل البنكي', 'bank_details', 30, 'عنوان بيانات البنك'),
  ('bank_account_name_label', 'اسم المستفيد', 'bank_details', 31, 'تسمية اسم الحساب'),
  ('bank_name_label', 'اسم البنك', 'bank_details', 32, 'تسمية اسم البنك'),
  ('account_number_label', 'رقم الحساب', 'bank_details', 33, 'تسمية رقم الحساب'),
  ('iban_label', 'الآيبان', 'bank_details', 34, 'تسمية الآيبان'),
  ('bank_note', 'يُفضل كتابة رقم العقد ({contract_number}) في ملاحظات التحويل', 'bank_details', 35, 'ملاحظة التحويل'),
  
  ('upload_title', 'رفع إيصال الدفع', 'upload_section', 40, 'عنوان قسم الرفع'),
  ('upload_description', 'بعد إتمام التحويل البنكي، يرجى رفع صورة أو ملف PDF للإيصال', 'upload_section', 41, 'وصف قسم الرفع'),
  ('transfer_date_label', 'تاريخ التحويل (اختياري)', 'upload_section', 42, 'تسمية تاريخ التحويل'),
  ('notes_label', 'ملاحظات إضافية (اختياري)', 'upload_section', 43, 'تسمية الملاحظات'),
  
  ('btn_upload', 'إرسال إيصال الدفع للتحقق', 'button', 50, 'زر رفع الإيصال'),
  ('btn_cancel', 'إلغاء', 'button', 51, 'زر الإلغاء'),
  
  ('msg_upload_success', 'تم استلام إيصالك بنجاح! سيتم مراجعته من قبل الإدارة', 'message', 60, 'رسالة نجاح الرفع'),
  ('msg_ai_match_good', 'يظهر أن المبلغ مطابق تقريبًا لمبلغ العقد. سيتم التحقق النهائي من الإدارة', 'message', 61, 'رسالة مطابقة جيدة'),
  ('msg_ai_match_poor', 'يوجد فرق في المبلغ. سيتم التواصل معك من الإدارة لتأكيد التفاصيل', 'message', 62, 'رسالة عدم مطابقة'),
  
  ('warning_checkbox', 'يجب الموافقة على بنود العقد قبل المتابعة', 'warning', 70, 'تحذير Checkbox'),
  ('warning_file_required', 'يجب رفع ملف الإيصال', 'warning', 71, 'تحذير الملف مطلوب')
ON CONFLICT (text_key) DO NOTHING;

-- إدراج معلومات الحساب البنكي الافتراضية
INSERT INTO b2f_bank_account_info (
  account_name,
  bank_name,
  account_number,
  iban,
  additional_notes,
  is_active
) VALUES (
  'منصة استثمار أشجار المزارع',
  'البنك الأهلي السعودي',
  '1234567890',
  'SA0000000000000000000000',
  'يرجى كتابة رقم العقد في ملاحظات التحويل',
  true
);
