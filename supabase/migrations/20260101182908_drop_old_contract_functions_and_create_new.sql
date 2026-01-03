/*
  # حذف الدوال القديمة وإنشاء النظام الجديد

  1. حذف الدوال القديمة
  2. إنشاء جدول المسودات
  3. إنشاء الدوال الجديدة
*/

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS create_contract_draft(UUID, TEXT);
DROP FUNCTION IF EXISTS update_draft_content(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS issue_contract_from_draft(UUID, TEXT);
DROP FUNCTION IF EXISTS bulk_issue_contracts(UUID[], TEXT);
DROP FUNCTION IF EXISTS transfer_beneficiary(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

-- حذف الجدول القديم إن وجد
DROP TABLE IF EXISTS b2f_contract_drafts CASCADE;

-- جدول مسودات العقود
CREATE TABLE b2f_contract_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_number TEXT UNIQUE NOT NULL,
  sales_request_id UUID NOT NULL REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  investor_phone TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  farm_id UUID NOT NULL REFERENCES b2f_farms(id),
  trees_count INTEGER NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  draft_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_edited_by TEXT,
  last_edited_at TIMESTAMPTZ,
  issued BOOLEAN DEFAULT false,
  issued_at TIMESTAMPTZ,
  contract_id UUID REFERENCES b2f_contracts(id)
);

CREATE INDEX idx_contract_drafts_request ON b2f_contract_drafts(sales_request_id);
CREATE INDEX idx_contract_drafts_status ON b2f_contract_drafts(status);
CREATE INDEX idx_contract_drafts_phone ON b2f_contract_drafts(investor_phone);

-- RLS
ALTER TABLE b2f_contract_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contract drafts"
  ON b2f_contract_drafts FOR ALL
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

-- Sequence لترقيم المسودات
CREATE SEQUENCE IF NOT EXISTS b2f_draft_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS b2f_contract_number_seq START 1;

-- Function: إنشاء مسودة عقد
CREATE FUNCTION create_contract_draft(
  p_request_id UUID,
  p_created_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_farm RECORD;
  v_opportunity RECORD;
  v_draft_id UUID;
  v_draft_number TEXT;
  v_draft_content TEXT;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = p_request_id
    AND finance_status = 'approved'
    AND contract_issued = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو غير جاهز');
  END IF;

  SELECT * INTO v_farm FROM b2f_farms WHERE id = v_request.farm_id;
  SELECT * INTO v_opportunity FROM b2f_opportunities WHERE id = v_request.opportunity_id;

  v_draft_number := 'DRAFT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('b2f_draft_number_seq')::TEXT, 6, '0');
  v_start_date := CURRENT_DATE;
  v_end_date := v_start_date + (v_opportunity.contract_duration_years * 12 || ' months')::INTERVAL;

  v_draft_content := format(
    E'عقد استثمار أشجار\n\nرقم المسودة: %s\nتاريخ: %s\n\n' ||
    '=== بيانات الأطراف ===\n\n' ||
    'المنصة: B2F للاستثمار الزراعي\n' ||
    'المستثمر: %s\nالجوال: %s\n\n' ||
    '=== تفاصيل الاستثمار ===\n\n' ||
    'المزرعة: %s\nالموقع: %s\n' ||
    'نوع الأشجار: %s\nالعدد: %s شجرة\n' ||
    'المدة: %s سنوات (%s شهر)\n' ||
    'البداية: %s\nالنهاية: %s\n' ||
    'القيمة: %s ريال\n\n' ||
    '=== الشروط ===\n\n' ||
    '1. إدارة وصيانة الأشجار\n' ||
    '2. عوائد الإنتاج حسب الاتفاق\n' ||
    '3. إمكانية نقل الانتفاع\n' ||
    '4. الخضوع للأنظمة السعودية',
    v_draft_number, TO_CHAR(now(), 'YYYY-MM-DD'),
    v_request.investor_name, v_request.investor_phone,
    v_farm.name, v_farm.city,
    v_opportunity.tree_type, v_request.number_of_trees,
    v_opportunity.contract_duration_years, v_opportunity.contract_duration_years * 12,
    TO_CHAR(v_start_date, 'YYYY-MM-DD'), TO_CHAR(v_end_date, 'YYYY-MM-DD'),
    v_request.total_amount
  );

  INSERT INTO b2f_contract_drafts (
    draft_number, sales_request_id, investor_phone, investor_name,
    farm_id, trees_count, total_amount, duration_months,
    start_date, end_date, draft_content, created_by
  ) VALUES (
    v_draft_number, p_request_id, v_request.investor_phone, v_request.investor_name,
    v_request.farm_id, v_request.number_of_trees, v_request.total_amount,
    v_opportunity.contract_duration_years * 12,
    v_start_date, v_end_date, v_draft_content, p_created_by
  ) RETURNING id INTO v_draft_id;

  RETURN json_build_object('success', true, 'draft_id', v_draft_id, 'draft_number', v_draft_number);
END;
$$;

-- Function: تعديل نص المسودة
CREATE FUNCTION update_draft_content(
  p_draft_id UUID,
  p_new_content TEXT,
  p_edited_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE b2f_contract_drafts
  SET draft_content = p_new_content, last_edited_by = p_edited_by, last_edited_at = now()
  WHERE id = p_draft_id AND status = 'draft';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المسودة غير موجودة');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Function: إصدار عقد من مسودة
CREATE FUNCTION issue_contract_from_draft(
  p_draft_id UUID,
  p_issued_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_draft RECORD;
  v_contract_id UUID;
  v_contract_number TEXT;
BEGIN
  SELECT * INTO v_draft FROM b2f_contract_drafts
  WHERE id = p_draft_id AND status = 'draft';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المسودة غير موجودة');
  END IF;

  v_contract_number := 'CONT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('b2f_contract_number_seq')::TEXT, 6, '0');

  INSERT INTO b2f_contracts (
    contract_number, sales_request_id, investor_phone, farm_id,
    trees_count, amount_total, start_date, end_date, duration_months,
    contract_content, visible_to_investor, status,
    current_beneficiary_phone, current_beneficiary_name,
    original_beneficiary_phone, original_beneficiary_name
  ) VALUES (
    v_contract_number, v_draft.sales_request_id, v_draft.investor_phone, v_draft.farm_id,
    v_draft.trees_count, v_draft.total_amount, v_draft.start_date, v_draft.end_date, v_draft.duration_months,
    v_draft.draft_content, true, 'active',
    v_draft.investor_phone, v_draft.investor_name,
    v_draft.investor_phone, v_draft.investor_name
  ) RETURNING id INTO v_contract_id;

  UPDATE b2f_contract_drafts
  SET status = 'issued', issued = true, issued_at = now(), contract_id = v_contract_id
  WHERE id = p_draft_id;

  UPDATE b2f_sales_requests
  SET contract_issued = true, contract_issued_at = now()
  WHERE id = v_draft.sales_request_id;

  INSERT INTO guest_notifications (recipient_phone, type, priority, title_ar, message_ar)
  VALUES (v_draft.investor_phone, 'contract_issued', 'high', 'تم إصدار العقد', 'عقد رقم: ' || v_contract_number);

  RETURN json_build_object('success', true, 'contract_id', v_contract_id, 'contract_number', v_contract_number);
END;
$$;

-- Function: إصدار جماعي
CREATE FUNCTION bulk_issue_contracts(
  p_request_ids UUID[],
  p_issued_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_draft_result JSON;
  v_issue_result JSON;
  v_success_count INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  v_total := array_length(p_request_ids, 1);

  FOREACH v_request_id IN ARRAY p_request_ids LOOP
    v_draft_result := create_contract_draft(v_request_id, p_issued_by);
    IF (v_draft_result->>'success')::BOOLEAN THEN
      v_issue_result := issue_contract_from_draft((v_draft_result->>'draft_id')::UUID, p_issued_by);
      IF (v_issue_result->>'success')::BOOLEAN THEN
        v_success_count := v_success_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'total', v_total, 'success_count', v_success_count);
END;
$$;

-- Function: نقل الانتفاع
CREATE FUNCTION transfer_beneficiary(
  p_contract_id UUID,
  p_to_phone TEXT,
  p_to_name TEXT,
  p_to_national_id TEXT,
  p_transfer_reason TEXT,
  p_requested_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_transfer_number TEXT;
BEGIN
  SELECT * INTO v_contract FROM b2f_contracts WHERE id = p_contract_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'العقد غير موجود');
  END IF;

  v_transfer_number := 'TRANS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 999999)::TEXT, 6, '0');

  -- تحديث العقد
  UPDATE b2f_contracts
  SET
    current_beneficiary_phone = p_to_phone,
    current_beneficiary_name = p_to_name,
    is_transferred = true,
    transfer_count = COALESCE(transfer_count, 0) + 1,
    last_transferred_at = now()
  WHERE id = p_contract_id;

  -- سجل التحويل
  INSERT INTO b2f_contract_transfers (
    transfer_number, contract_id, from_phone, from_name,
    to_phone, to_name, to_national_id, transfer_reason, requested_by
  ) VALUES (
    v_transfer_number, p_contract_id,
    v_contract.current_beneficiary_phone, v_contract.current_beneficiary_name,
    p_to_phone, p_to_name, p_to_national_id, p_transfer_reason, p_requested_by
  );

  -- إشعارات
  INSERT INTO guest_notifications (recipient_phone, type, priority, title_ar, message_ar)
  VALUES
    (v_contract.current_beneficiary_phone, 'contract_transferred_from', 'high',
     'تم نقل العقد', 'تم نقل عقد رقم: ' || v_contract.contract_number),
    (p_to_phone, 'contract_transferred_to', 'high',
     'تم استلام عقد', 'تم نقل عقد رقم: ' || v_contract.contract_number || ' إليك');

  RETURN json_build_object('success', true, 'transfer_number', v_transfer_number);
END;
$$;

-- جدول سجل التحويلات
CREATE TABLE IF NOT EXISTS b2f_contract_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT UNIQUE NOT NULL,
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id),
  from_phone TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  to_name TEXT NOT NULL,
  to_national_id TEXT,
  transfer_reason TEXT,
  requested_by TEXT,
  transferred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contract_transfers_contract ON b2f_contract_transfers(contract_id);

ALTER TABLE b2f_contract_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view transfers"
  ON b2f_contract_transfers FOR SELECT
  TO authenticated
  USING (is_b2f_admin(auth.uid()));
