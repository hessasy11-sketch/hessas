/*
  # تحسين نظام التشغيل على مستوى المزرعة - المرحلة 3

  1. التحديثات
    - إضافة حقل `sent_to_investors` لجدول `b2f_farm_operation_updates`
    - إنشاء جدول `investor_operations` لتتبع التحديثات لكل مستثمر
    - إضافة دوال للربط التلقائي

  2. الأمان
    - سياسات RLS للمستثمرين
    - حماية البيانات الحساسة

  3. الدوال
    - `send_farm_update_to_investors()` - إرسال تحديث لجميع المستثمرين
    - `get_investor_farm_operations()` - جلب تحديثات المستثمر
    - `mark_operation_as_read()` - تعليم تحديث كمقروء
*/

-- إضافة حقل sent_to_investors لجدول التحديثات
ALTER TABLE b2f_farm_operation_updates
ADD COLUMN IF NOT EXISTS sent_to_investors boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS investors_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- إنشاء جدول تتبع التحديثات للمستثمرين
CREATE TABLE IF NOT EXISTS investor_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  farm_operation_id uuid REFERENCES b2f_farm_operations(id) ON DELETE CASCADE,
  operation_update_id uuid REFERENCES b2f_farm_operation_updates(id) ON DELETE CASCADE,

  -- معلومات التحديث (نسخة للأداء)
  update_type text NOT NULL,
  title text NOT NULL,
  description text,
  related_phase text,

  -- حالة القراءة
  is_read boolean DEFAULT false,
  read_at timestamptz,

  -- التواريخ
  operation_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT investor_operations_unique_key
    UNIQUE (contract_id, operation_update_id)
);

-- الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_investor_operations_investor
  ON investor_operations(investor_id);

CREATE INDEX IF NOT EXISTS idx_investor_operations_contract
  ON investor_operations(contract_id);

CREATE INDEX IF NOT EXISTS idx_investor_operations_farm
  ON investor_operations(farm_id);

CREATE INDEX IF NOT EXISTS idx_investor_operations_unread
  ON investor_operations(investor_id, is_read)
  WHERE is_read = false;

-- سياسات RLS
ALTER TABLE investor_operations ENABLE ROW LEVEL SECURITY;

-- المستثمرون يمكنهم رؤية تحديثاتهم فقط
CREATE POLICY "Investors can view their own operations"
  ON investor_operations
  FOR SELECT
  TO authenticated, anon
  USING (
    investor_id IN (
      SELECT id FROM b2f_investor_accounts
      WHERE contact_phone = auth.jwt()->>'phone'
        OR contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

-- المستثمرون يمكنهم تحديث حالة القراءة فقط
CREATE POLICY "Investors can update read status"
  ON investor_operations
  FOR UPDATE
  TO authenticated, anon
  USING (
    investor_id IN (
      SELECT id FROM b2f_investor_accounts
      WHERE contact_phone = auth.jwt()->>'phone'
        OR contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  )
  WITH CHECK (
    investor_id IN (
      SELECT id FROM b2f_investor_accounts
      WHERE contact_phone = auth.jwt()->>'phone'
        OR contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

-- الإدارة لديها وصول كامل
CREATE POLICY "Admins full access to investor operations"
  ON investor_operations
  FOR ALL
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- دالة إرسال التحديث لجميع المستثمرين
CREATE OR REPLACE FUNCTION send_farm_update_to_investors(
  p_farm_id uuid,
  p_operation_update_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_operation_id uuid;
  v_update_data record;
  v_contracts_count integer := 0;
  v_investors_count integer := 0;
BEGIN
  -- جلب معلومات التحديث
  SELECT
    fou.farm_operation_id,
    fou.update_type,
    fou.title,
    fou.description,
    fou.related_phase,
    fou.created_at
  INTO v_update_data
  FROM b2f_farm_operation_updates fou
  WHERE fou.id = p_operation_update_id
    AND fou.farm_operation_id IN (
      SELECT id FROM b2f_farm_operations WHERE farm_id = p_farm_id
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'التحديث غير موجود'
    );
  END IF;

  v_farm_operation_id := v_update_data.farm_operation_id;

  -- إدراج سجل لكل عقد نشط
  INSERT INTO investor_operations (
    investor_id,
    contract_id,
    farm_id,
    farm_operation_id,
    operation_update_id,
    update_type,
    title,
    description,
    related_phase,
    operation_date,
    is_read
  )
  SELECT
    c.investor_id,
    c.id as contract_id,
    c.farm_id,
    v_farm_operation_id,
    p_operation_update_id,
    v_update_data.update_type,
    v_update_data.title,
    v_update_data.description,
    v_update_data.related_phase,
    v_update_data.created_at,
    false
  FROM b2f_contracts c
  WHERE c.farm_id = p_farm_id
    AND c.status = 'active'
    AND c.investor_id IS NOT NULL
  ON CONFLICT (contract_id, operation_update_id) DO NOTHING;

  -- حساب عدد العقود والمستثمرين
  GET DIAGNOSTICS v_contracts_count = ROW_COUNT;

  SELECT COUNT(DISTINCT investor_id) INTO v_investors_count
  FROM investor_operations
  WHERE operation_update_id = p_operation_update_id;

  -- تحديث حالة الإرسال
  UPDATE b2f_farm_operation_updates
  SET
    sent_to_investors = true,
    investors_count = v_investors_count,
    sent_at = now()
  WHERE id = p_operation_update_id;

  RETURN jsonb_build_object(
    'success', true,
    'contracts_count', v_contracts_count,
    'investors_count', v_investors_count,
    'message', format('تم إرسال التحديث لـ %s مستثمر عبر %s عقد', v_investors_count, v_contracts_count)
  );
END;
$$;

-- دالة جلب تحديثات المستثمر
CREATE OR REPLACE FUNCTION get_investor_farm_operations(p_phone text)
RETURNS TABLE (
  id uuid,
  contract_number text,
  farm_name text,
  update_type text,
  title text,
  description text,
  related_phase text,
  operation_date timestamptz,
  is_read boolean,
  read_at timestamptz,
  trees_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    io.id,
    c.contract_number,
    f.name as farm_name,
    io.update_type,
    io.title,
    io.description,
    io.related_phase,
    io.operation_date,
    io.is_read,
    io.read_at,
    c.trees_count
  FROM investor_operations io
  INNER JOIN b2f_contracts c ON c.id = io.contract_id
  INNER JOIN b2f_farms f ON f.id = io.farm_id
  INNER JOIN b2f_investor_accounts ia ON ia.id = io.investor_id
  WHERE ia.contact_phone = p_phone
  ORDER BY io.operation_date DESC, io.created_at DESC;
END;
$$;

-- دالة تعليم التحديث كمقروء
CREATE OR REPLACE FUNCTION mark_operation_as_read(p_operation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE investor_operations
  SET
    is_read = true,
    read_at = now()
  WHERE id = p_operation_id
    AND is_read = false;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'العملية غير موجودة أو تم قراءتها مسبقاً');
  END IF;
END;
$$;

-- دالة الحصول على إحصائيات التحديثات للمستثمر
CREATE OR REPLACE FUNCTION get_investor_operations_stats(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_unread integer;
  v_contracts integer;
BEGIN
  -- إجمالي التحديثات
  SELECT COUNT(*) INTO v_total
  FROM investor_operations io
  INNER JOIN b2f_investor_accounts ia ON ia.id = io.investor_id
  WHERE ia.contact_phone = p_phone;

  -- التحديثات غير المقروءة
  SELECT COUNT(*) INTO v_unread
  FROM investor_operations io
  INNER JOIN b2f_investor_accounts ia ON ia.id = io.investor_id
  WHERE ia.contact_phone = p_phone
    AND io.is_read = false;

  -- عدد العقود النشطة
  SELECT COUNT(DISTINCT c.id) INTO v_contracts
  FROM b2f_contracts c
  INNER JOIN b2f_investor_accounts ia ON ia.id = c.investor_id
  WHERE ia.contact_phone = p_phone
    AND c.status = 'active';

  RETURN jsonb_build_object(
    'total_updates', v_total,
    'unread_updates', v_unread,
    'active_contracts', v_contracts
  );
END;
$$;

-- تعليق على الجداول والأعمدة
COMMENT ON TABLE investor_operations IS 'تتبع التحديثات التشغيلية لكل مستثمر مرتبط بالمزرعة عبر العقود';
COMMENT ON COLUMN b2f_farm_operation_updates.sent_to_investors IS 'هل تم إرسال التحديث للمستثمرين؟';
COMMENT ON COLUMN b2f_farm_operation_updates.investors_count IS 'عدد المستثمرين الذين وصلهم التحديث';
COMMENT ON COLUMN investor_operations.is_read IS 'هل قرأ المستثمر هذا التحديث؟';
