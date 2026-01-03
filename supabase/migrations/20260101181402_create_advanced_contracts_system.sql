/*
  # نظام العقود المتطور - المراحل الأربع
  
  1. مسودات العقود (Contract Drafts)
  2. قوالب العقود المعتمدة (Contract Templates)
  3. نقل مدة الانتفاع (Beneficiary Transfers)
  4. سجل تاريخ العقد (Contract History)
*/

-- ============================================
-- 1. جدول قوالب العقود المعتمدة
-- ============================================
CREATE TABLE IF NOT EXISTS b2f_contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_version TEXT DEFAULT 'v1.0',
  contract_content TEXT NOT NULL, -- نص العقد الكامل
  
  -- متغيرات القالب
  variables JSONB DEFAULT '{}', -- {investor_name}, {trees_count}, etc.
  
  -- معلومات الاعتماد
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  
  -- الحالة
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- القالب الافتراضي
  
  -- ملاحظات
  notes TEXT,
  policy_compliance_notes TEXT, -- ملاحظات الامتثال لسياسة المنصة
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. جدول مسودات العقود
-- ============================================
CREATE TABLE IF NOT EXISTS b2f_contract_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_number TEXT UNIQUE NOT NULL,
  
  -- ارتباط بالطلب
  sales_request_id UUID REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  payment_document_id UUID REFERENCES b2f_payment_documents(id),
  
  -- القالب المستخدم
  template_id UUID REFERENCES b2f_contract_templates(id),
  
  -- محتوى المسودة
  draft_content TEXT NOT NULL, -- نص العقد المعدّل
  contract_data JSONB DEFAULT '{}', -- بيانات العقد المجمعة
  
  -- بيانات أساسية
  investor_phone TEXT NOT NULL,
  investor_name TEXT,
  farm_id UUID REFERENCES b2f_farms(id),
  opportunity_id UUID REFERENCES b2f_opportunities(id),
  trees_count INTEGER,
  total_amount DECIMAL(10,2),
  
  -- مدة الانتفاع
  duration_months INTEGER DEFAULT 120, -- 10 سنوات افتراضياً
  start_date DATE,
  end_date DATE,
  
  -- حالة المسودة
  status TEXT DEFAULT 'draft', -- draft, under_review, approved, rejected, issued
  
  -- مراجعة المسودة
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- التعديلات
  edit_count INTEGER DEFAULT 0,
  last_edited_by TEXT,
  last_edited_at TIMESTAMPTZ,
  
  -- الإصدار
  issued BOOLEAN DEFAULT false,
  issued_contract_id UUID REFERENCES b2f_contracts(id),
  issued_at TIMESTAMPTZ,
  
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_draft_status CHECK (status IN ('draft', 'under_review', 'approved', 'rejected', 'issued'))
);

-- ============================================
-- 3. تحديث جدول العقود
-- ============================================
ALTER TABLE b2f_contracts 
  ADD COLUMN IF NOT EXISTS draft_id UUID REFERENCES b2f_contract_drafts(id),
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES b2f_contract_templates(id),
  ADD COLUMN IF NOT EXISTS current_beneficiary_phone TEXT,
  ADD COLUMN IF NOT EXISTS current_beneficiary_name TEXT,
  ADD COLUMN IF NOT EXISTS original_beneficiary_phone TEXT,
  ADD COLUMN IF NOT EXISTS original_beneficiary_name TEXT,
  ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_transferred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_content TEXT, -- نص العقد الصادر
  ADD COLUMN IF NOT EXISTS pdf_url TEXT, -- رابط PDF
  ADD COLUMN IF NOT EXISTS visible_to_investor BOOLEAN DEFAULT true;

-- تحديث القيم الافتراضية للعقود الموجودة
UPDATE b2f_contracts
SET 
  current_beneficiary_phone = investor_phone,
  original_beneficiary_phone = investor_phone
WHERE current_beneficiary_phone IS NULL;

-- ============================================
-- 4. جدول طلبات نقل مدة الانتفاع
-- ============================================
CREATE TABLE IF NOT EXISTS b2f_contract_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT UNIQUE NOT NULL,
  
  -- العقد المراد نقله
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  
  -- المنتفع الحالي (القديم)
  from_phone TEXT NOT NULL,
  from_name TEXT,
  
  -- المنتفع الجديد
  to_phone TEXT NOT NULL,
  to_name TEXT NOT NULL,
  to_national_id TEXT,
  to_email TEXT,
  
  -- سبب النقل
  transfer_reason TEXT,
  transfer_type TEXT DEFAULT 'full', -- full, partial
  
  -- رسوم النقل
  transfer_fee DECIMAL(10,2) DEFAULT 0,
  fee_paid BOOLEAN DEFAULT false,
  
  -- الحالة
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed
  
  -- الموافقات
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- التنفيذ
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_transfer_status CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  CONSTRAINT valid_transfer_type CHECK (transfer_type IN ('full', 'partial'))
);

-- ============================================
-- 5. جدول سجل تاريخ العقد
-- ============================================
CREATE TABLE IF NOT EXISTS b2f_contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  
  -- نوع الحدث
  event_type TEXT NOT NULL, -- issued, transferred, renewed, terminated, suspended
  event_description TEXT NOT NULL,
  
  -- البيانات قبل وبعد
  before_data JSONB DEFAULT '{}',
  after_data JSONB DEFAULT '{}',
  
  -- المنتفع وقت الحدث
  beneficiary_phone TEXT,
  beneficiary_name TEXT,
  
  -- معلومات الموظف
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ملاحظات
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. دالة توليد رقم مسودة
-- ============================================
CREATE OR REPLACE FUNCTION generate_draft_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_draft_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(draft_number FROM 11) AS INTEGER)), 0) + 1
  INTO v_count
  FROM b2f_contract_drafts
  WHERE draft_number LIKE 'DRAFT-' || v_year || '-%';
  
  v_draft_number := 'DRAFT-' || v_year || '-' || LPAD(v_count::TEXT, 6, '0');
  
  RETURN v_draft_number;
END;
$$;

-- ============================================
-- 7. دالة توليد رقم نقل
-- ============================================
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_transfer_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM 13) AS INTEGER)), 0) + 1
  INTO v_count
  FROM b2f_contract_transfers
  WHERE transfer_number LIKE 'TRANSFER-' || v_year || '-%';
  
  v_transfer_number := 'TRANSFER-' || v_year || '-' || LPAD(v_count::TEXT, 6, '0');
  
  RETURN v_transfer_number;
END;
$$;

-- ============================================
-- 8. دالة: إنشاء مسودة عقد
-- ============================================
CREATE OR REPLACE FUNCTION create_contract_draft(
  p_request_id UUID,
  p_created_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_payment_doc RECORD;
  v_farm RECORD;
  v_opportunity RECORD;
  v_template RECORD;
  v_draft_id UUID;
  v_draft_number TEXT;
  v_contract_content TEXT;
  v_duration_months INTEGER;
BEGIN
  -- جلب الطلب
  SELECT * INTO v_request FROM b2f_sales_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  -- جلب وثيقة السداد
  SELECT * INTO v_payment_doc 
  FROM b2f_payment_documents 
  WHERE sales_request_id = p_request_id 
    AND finance_status = 'manually_approved'
  ORDER BY approved_at DESC LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يوجد سداد معتمد');
  END IF;
  
  -- جلب بيانات المزرعة والفرصة
  SELECT * INTO v_farm FROM b2f_farms WHERE id = v_request.farm_id;
  SELECT * INTO v_opportunity FROM b2f_opportunities WHERE id = v_request.opportunity_id;
  
  v_duration_months := COALESCE(v_opportunity.contract_duration_years, 10) * 12;
  
  -- جلب القالب الافتراضي
  SELECT * INTO v_template 
  FROM b2f_contract_templates 
  WHERE is_active = true AND is_default = true
  ORDER BY created_at DESC LIMIT 1;
  
  -- إنشاء محتوى المسودة من القالب
  IF v_template.id IS NOT NULL THEN
    v_contract_content := v_template.contract_content;
    
    -- استبدال المتغيرات
    v_contract_content := REPLACE(v_contract_content, '{investor_name}', COALESCE(v_request.investor_name, 'غير محدد'));
    v_contract_content := REPLACE(v_contract_content, '{investor_phone}', v_request.investor_phone);
    v_contract_content := REPLACE(v_contract_content, '{trees_count}', v_request.number_of_trees::TEXT);
    v_contract_content := REPLACE(v_contract_content, '{total_amount}', v_request.total_amount::TEXT);
    v_contract_content := REPLACE(v_contract_content, '{farm_name}', v_farm.name);
    v_contract_content := REPLACE(v_contract_content, '{tree_type}', COALESCE(v_opportunity.tree_type, 'أشجار'));
    v_contract_content := REPLACE(v_contract_content, '{duration_years}', (v_duration_months / 12)::TEXT);
  ELSE
    -- محتوى افتراضي بسيط
    v_contract_content := 'عقد انتفاع بأشجار زراعية' || E'\n\n' ||
                          'الطرف الأول: منصة B2F' || E'\n' ||
                          'الطرف الثاني (المنتفع): ' || COALESCE(v_request.investor_name, 'غير محدد') || E'\n' ||
                          'رقم الجوال: ' || v_request.investor_phone || E'\n\n' ||
                          'تفاصيل الانتفاع:' || E'\n' ||
                          '- المزرعة: ' || v_farm.name || E'\n' ||
                          '- نوع الشجر: ' || COALESCE(v_opportunity.tree_type, 'أشجار') || E'\n' ||
                          '- عدد الأشجار: ' || v_request.number_of_trees || E'\n' ||
                          '- المبلغ الإجمالي: ' || v_request.total_amount || ' ريال' || E'\n' ||
                          '- مدة الانتفاع: ' || (v_duration_months / 12) || ' سنوات';
  END IF;
  
  -- توليد رقم المسودة
  v_draft_number := generate_draft_number();
  
  -- إنشاء المسودة
  INSERT INTO b2f_contract_drafts (
    draft_number, sales_request_id, payment_document_id, template_id,
    draft_content, investor_phone, investor_name,
    farm_id, opportunity_id, trees_count, total_amount,
    duration_months, start_date, end_date,
    contract_data, created_by
  ) VALUES (
    v_draft_number, p_request_id, v_payment_doc.id, v_template.id,
    v_contract_content, v_request.investor_phone, v_request.investor_name,
    v_request.farm_id, v_request.opportunity_id, 
    v_request.number_of_trees, v_request.total_amount,
    v_duration_months, CURRENT_DATE, 
    CURRENT_DATE + (v_duration_months || ' months')::INTERVAL,
    jsonb_build_object(
      'farm_name', v_farm.name,
      'tree_type', COALESCE(v_opportunity.tree_type, 'أشجار'),
      'location', v_farm.location
    ),
    p_created_by
  ) RETURNING id INTO v_draft_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'draft_id', v_draft_id,
    'draft_number', v_draft_number,
    'message', 'تم إنشاء مسودة العقد بنجاح'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 9. سياسات RLS
-- ============================================

-- Contract Templates
ALTER TABLE b2f_contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage templates" ON b2f_contract_templates FOR ALL USING (is_b2f_admin());
CREATE POLICY "Authenticated can view active templates" ON b2f_contract_templates FOR SELECT USING (is_active = true);

-- Contract Drafts
ALTER TABLE b2f_contract_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage drafts" ON b2f_contract_drafts FOR ALL USING (is_b2f_admin());

-- Contract Transfers
ALTER TABLE b2f_contract_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage transfers" ON b2f_contract_transfers FOR ALL USING (is_b2f_admin());

-- Contract History
ALTER TABLE b2f_contract_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view history" ON b2f_contract_history FOR SELECT USING (is_b2f_admin());
CREATE POLICY "System can insert history" ON b2f_contract_history FOR INSERT WITH CHECK (true);

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_contract_draft(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_draft_number() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_transfer_number() TO authenticated, anon;