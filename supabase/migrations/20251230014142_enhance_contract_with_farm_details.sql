/*
  # تحسين نظام العقود - إضافة بيانات المزرعة التلقائية

  1. تحديث جدول العقود لإضافة:
     - المدينة
     - المنطقة
     - معلومات إضافية من المزرعة

  2. تحديث دالة issue_contract لجلب البيانات تلقائياً
*/

-- إضافة حقول المدينة والمنطقة لجدول العقود
DO $$
BEGIN
  -- إضافة city إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_contracts'
    AND column_name = 'city'
  ) THEN
    ALTER TABLE b2f_contracts ADD COLUMN city text;
  END IF;

  -- إضافة region إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_contracts'
    AND column_name = 'region'
  ) THEN
    ALTER TABLE b2f_contracts ADD COLUMN region text;
  END IF;

  -- إضافة farm_location إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_contracts'
    AND column_name = 'farm_location'
  ) THEN
    ALTER TABLE b2f_contracts ADD COLUMN farm_location text;
  END IF;
END $$;

-- تحديث دالة issue_contract لجلب بيانات المزرعة كاملة
CREATE OR REPLACE FUNCTION issue_contract(
  p_request_id uuid
)
RETURNS json AS $$
DECLARE
  v_contract_number text;
  v_request record;
  v_farm record;
  v_opportunity record;
  v_result json;
BEGIN
  -- جلب بيانات الطلب
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

  -- جلب بيانات الفرصة الاستثمارية
  SELECT * INTO v_opportunity
  FROM b2f_opportunities
  WHERE id = v_request.opportunity_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الفرصة الاستثمارية غير موجودة'
    );
  END IF;

  -- جلب بيانات المزرعة كاملة
  SELECT * INTO v_farm
  FROM b2f_farms
  WHERE id = v_request.farm_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المزرعة غير موجودة'
    );
  END IF;

  -- توليد رقم عقد فريد
  v_contract_number := generate_unique_contract_number();

  -- تحديث الطلب
  UPDATE b2f_sales_requests
  SET
    status = 'contract_issued',
    contract_number = v_contract_number,
    contract_issued_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  -- إنشاء العقد مع جميع بيانات المزرعة تلقائياً
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
    city,
    region,
    farm_location,
    opportunity_title,
    tree_type,
    tree_count,
    total_amount,
    status
  ) VALUES (
    v_request.id,
    v_contract_number,
    CURRENT_DATE,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 years',
    10,
    v_request.investor_name,
    v_request.investor_phone,
    v_farm.name,                    -- اسم المزرعة
    v_farm.city,                    -- المدينة
    v_farm.location,                -- المنطقة
    v_farm.location_url,            -- رابط الموقع
    v_opportunity.title,            -- عنوان الفرصة
    v_request.tree_type,            -- نوع الشجرة
    v_request.number_of_trees,      -- عدد الأشجار
    v_request.total_amount,         -- المبلغ الإجمالي
    'active'
  );

  -- إرجاع النتيجة
  v_result := json_build_object(
    'success', true,
    'contractNumber', v_contract_number,
    'requestId', p_request_id,
    'issuedAt', now(),
    'farmName', v_farm.name,
    'city', v_farm.city,
    'location', v_farm.location
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION issue_contract(uuid) IS 'إصدار عقد استنفاع جديد مع جلب جميع البيانات من المزرعة تلقائياً: الاسم، المدينة، المنطقة، نوع الشجرة، المدة، السعر';
