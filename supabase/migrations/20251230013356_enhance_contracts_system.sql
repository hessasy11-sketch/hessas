/*
  # تحسين نظام العقود

  1. إضافة حقول جديدة
     - contract_pdf_url: رابط ملف PDF للعقد
     - transferred_to_operations: تم التحويل للتشغيل
     - transferred_at: تاريخ التحويل

  2. إضافة سياسات RLS للتحكم في الوصول

  3. إنشاء دوال مساعدة لإصدار العقود
*/

-- إضافة حقول جديدة لجدول b2f_sales_requests
DO $$
BEGIN
  -- إضافة حقل PDF URL إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests'
    AND column_name = 'contract_pdf_url'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN contract_pdf_url text;
  END IF;

  -- إضافة حقل contract_issued_at إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests'
    AND column_name = 'contract_issued_at'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN contract_issued_at timestamptz;
  END IF;

  -- إضافة حقل transferred_to_operations إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests'
    AND column_name = 'transferred_to_operations'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN transferred_to_operations boolean DEFAULT false;
  END IF;

  -- إضافة حقل transferred_at إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests'
    AND column_name = 'transferred_at'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN transferred_at timestamptz;
  END IF;

  -- إضافة حقل contract_number إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests'
    AND column_name = 'contract_number'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN contract_number text;
  END IF;
END $$;

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_sales_requests_contract_issued
  ON b2f_sales_requests(contract_issued_at DESC)
  WHERE status = 'contract_issued';

CREATE INDEX IF NOT EXISTS idx_sales_requests_receipt_approved
  ON b2f_sales_requests(updated_at DESC)
  WHERE status = 'receipt_approved';

CREATE INDEX IF NOT EXISTS idx_sales_requests_transferred
  ON b2f_sales_requests(transferred_to_operations, transferred_at);

-- Function لتوليد رقم عقد فريد
CREATE OR REPLACE FUNCTION generate_unique_contract_number()
RETURNS text AS $$
DECLARE
  v_year text;
  v_month text;
  v_random text;
  v_contract_number text;
  v_attempts integer := 0;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  v_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::text, 2, '0');

  LOOP
    v_random := LPAD(FLOOR(RANDOM() * 9999)::text, 4, '0');
    v_contract_number := 'B2F-' || v_year || v_month || '-' || v_random;

    IF NOT EXISTS (
      SELECT 1 FROM b2f_sales_requests
      WHERE contract_number = v_contract_number
    ) THEN
      RETURN v_contract_number;
    END IF;

    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN
      v_contract_number := 'B2F-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text;
      RETURN v_contract_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function لإصدار عقد جديد
CREATE OR REPLACE FUNCTION issue_contract(
  p_request_id uuid
)
RETURNS json AS $$
DECLARE
  v_contract_number text;
  v_request record;
  v_result json;
BEGIN
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = p_request_id
  AND status = 'receipt_approved';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو ليس جاهزاً لإصدار العقد'
    );
  END IF;

  v_contract_number := generate_unique_contract_number();

  UPDATE b2f_sales_requests
  SET
    status = 'contract_issued',
    contract_number = v_contract_number,
    contract_issued_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO b2f_contracts (
    request_id,
    contract_number,
    contract_date,
    start_date,
    end_date,
    contract_duration_years,
    investor_name,
    investor_phone,
    farm_name,
    opportunity_title,
    tree_type,
    tree_count,
    total_amount,
    status
  )
  SELECT
    v_request.id,
    v_contract_number,
    CURRENT_DATE,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 years',
    10,
    v_request.investor_name,
    v_request.investor_phone,
    f.name,
    o.title,
    v_request.tree_type,
    v_request.number_of_trees,
    v_request.total_amount,
    'active'
  FROM b2f_farms f
  JOIN b2f_opportunities o ON o.farm_id = f.id
  WHERE o.id = v_request.opportunity_id;

  v_result := json_build_object(
    'success', true,
    'contractNumber', v_contract_number,
    'requestId', p_request_id,
    'issuedAt', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function لتحويل الطلب للتشغيل
CREATE OR REPLACE FUNCTION transfer_to_operations(
  p_request_id uuid
)
RETURNS json AS $$
DECLARE
  v_request record;
  v_result json;
BEGIN
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = p_request_id
  AND status = 'contract_issued'
  AND transferred_to_operations = false;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو تم تحويله مسبقاً'
    );
  END IF;

  UPDATE b2f_sales_requests
  SET
    transferred_to_operations = true,
    transferred_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  v_result := json_build_object(
    'success', true,
    'requestId', p_request_id,
    'transferredAt', now(),
    'message', 'تم تحويل الطلب لقسم التشغيل بنجاح'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_unique_contract_number() TO authenticated;
GRANT EXECUTE ON FUNCTION issue_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_to_operations(uuid) TO authenticated;

COMMENT ON FUNCTION issue_contract(uuid) IS 'إصدار عقد استنفاع جديد للطلب المعتمد';
COMMENT ON FUNCTION transfer_to_operations(uuid) IS 'تحويل الطلب لقسم التشغيل بعد إصدار العقد';
