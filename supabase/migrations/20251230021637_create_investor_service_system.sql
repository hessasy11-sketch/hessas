/*
  # نظام خدمة المستثمر - Investor Service System

  ## نظرة عامة
  نظام إدارة طلبات المستثمرين بعد تفعيل الأشجار
  
  ## الوظائف
  1. استقبال طلبات الاستفادة من المحصول
  2. إدارة طلبات الإهداء والصدقات
  3. معالجة طلبات نقل العقود
  4. تنظيم الزيارات والاستفسارات
  5. توثيق جميع الخدمات المقدمة
  
  ## أنواع الطلبات
  - harvest_delivery: استلام المحصول للمنزل
  - gift_harvest: إهداء المحصول لشخص
  - charity_waqf: صدقة/وقف خيري
  - transfer_contract: نقل عقد الاستنفاع
  - inquiry_visit: استفسار/زيارة المزرعة
  
  ## حالات الطلب
  - new: جديد
  - processing: تحت المعالجة
  - completed: مكتمل
  - completed_special: مكتمل مع تنفيذ خاص
  - rejected: مرفوض مع ملاحظة
*/

-- ===================================
-- 1. جدول أنواع الخدمات
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_service_types (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  requires_tree_ready boolean DEFAULT false,
  is_active boolean DEFAULT true,
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO b2f_service_types (id, name_ar, name_en, description, icon, color, requires_tree_ready, order_number) VALUES
  ('harvest_delivery', 'استلام المحصول للمنزل', 'Harvest Delivery', 'طلب توصيل المحصول إلى عنوان المستثمر', 'package-check', 'emerald', true, 1),
  ('gift_harvest', 'إهداء المحصول', 'Gift Harvest', 'إهداء المحصول لشخص معين', 'gift', 'pink', true, 2),
  ('charity_waqf', 'صدقة / وقف خيري', 'Charity/Waqf', 'تحويل المحصول إلى صدقة أو وقف', 'heart', 'purple', true, 3),
  ('transfer_contract', 'نقل عقد الاستنفاع', 'Transfer Contract', 'نقل العقد لمستفيد جديد', 'file-transfer', 'blue', false, 4),
  ('inquiry_visit', 'استفسار / زيارة', 'Inquiry/Visit', 'طلب زيارة المزرعة أو استفسار عام', 'help-circle', 'amber', false, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE b2f_service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service types"
  ON b2f_service_types FOR SELECT TO public
  USING (is_active = true);

-- ===================================
-- 2. جدول طلبات خدمة المستثمر
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_investor_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- المستثمر
  investor_account_id uuid REFERENCES b2f_investor_accounts(id),
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  investor_email text,
  
  -- الشجرة/البطاقة التشغيلية
  tree_operation_id uuid REFERENCES b2f_tree_operations(id) ON DELETE RESTRICT,
  farm_id uuid NOT NULL REFERENCES b2f_farms(id),
  opportunity_id uuid NOT NULL REFERENCES b2f_opportunities(id),
  contract_number text NOT NULL,
  
  -- نوع الخدمة
  service_type text NOT NULL REFERENCES b2f_service_types(id),
  
  -- حالة الطلب
  status text NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'processing', 'completed', 'completed_special', 'rejected')
  ),
  
  -- تفاصيل الطلب (حسب النوع)
  request_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  /*
    harvest_delivery: {
      "address": "...",
      "city": "...",
      "phone": "...",
      "preferred_date": "..."
    }
    
    gift_harvest: {
      "recipient_name": "...",
      "recipient_phone": "...",
      "recipient_address": "...",
      "message": "..."
    }
    
    charity_waqf: {
      "organization_name": "...",
      "waqf_type": "general|specific",
      "notes": "..."
    }
    
    transfer_contract: {
      "new_beneficiary_name": "...",
      "new_beneficiary_phone": "...",
      "new_beneficiary_id": "...",
      "relationship": "...",
      "reason": "..."
    }
    
    inquiry_visit: {
      "inquiry_type": "visit|question|complaint",
      "subject": "...",
      "message": "...",
      "preferred_visit_date": "..."
    }
  */
  
  -- ملاحظات المستثمر
  investor_notes text,
  
  -- معالجة الطلب
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  
  -- ملاحظات الإدارة
  admin_notes text,
  rejection_reason text,
  
  -- المسؤول عن المعالجة
  processed_by_admin uuid REFERENCES b2f_admin_users(user_id),
  admin_name text,
  
  -- مرفقات (صور - مستندات)
  attachments jsonb DEFAULT '[]'::jsonb,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_investor ON b2f_investor_service_requests(investor_phone);
CREATE INDEX IF NOT EXISTS idx_service_requests_operation ON b2f_investor_service_requests(tree_operation_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON b2f_investor_service_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON b2f_investor_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON b2f_investor_service_requests(created_at DESC);

ALTER TABLE b2f_investor_service_requests ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Admins manage service requests"
  ON b2f_investor_service_requests FOR ALL TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

CREATE POLICY "Public can view own requests"
  ON b2f_investor_service_requests FOR SELECT TO public
  USING (true);

CREATE POLICY "Public can create requests"
  ON b2f_investor_service_requests FOR INSERT TO public
  WITH CHECK (true);

-- ===================================
-- 3. جدول سجل معالجة الطلبات
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_service_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES b2f_investor_service_requests(id) ON DELETE CASCADE,
  
  action_type text NOT NULL CHECK (
    action_type IN ('created', 'status_changed', 'note_added', 'completed', 'rejected')
  ),
  
  old_status text,
  new_status text,
  
  description text NOT NULL,
  admin_name text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_logs_request ON b2f_service_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_date ON b2f_service_request_logs(created_at DESC);

ALTER TABLE b2f_service_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage logs"
  ON b2f_service_request_logs FOR ALL TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

CREATE POLICY "Public can view logs"
  ON b2f_service_request_logs FOR SELECT TO public
  USING (true);

-- ===================================
-- 4. دالة إنشاء طلب خدمة
-- ===================================

CREATE OR REPLACE FUNCTION create_investor_service_request(
  p_operation_id uuid,
  p_service_type text,
  p_investor_name text,
  p_investor_phone text,
  p_investor_email text,
  p_request_details jsonb,
  p_investor_notes text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_operation record;
  v_service_type record;
  v_request_id uuid;
BEGIN
  -- جلب بيانات البطاقة التشغيلية
  SELECT * INTO v_operation
  FROM b2f_tree_operations
  WHERE id = p_operation_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'البطاقة التشغيلية غير موجودة أو غير نشطة');
  END IF;

  -- جلب بيانات نوع الخدمة
  SELECT * INTO v_service_type
  FROM b2f_service_types
  WHERE id = p_service_type
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'نوع الخدمة غير صحيح');
  END IF;

  -- التحقق من جاهزية الشجرة
  IF v_service_type.requires_tree_ready AND v_operation.current_phase != 'ready' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'هذه الخدمة تتطلب أن تكون الشجرة في مرحلة الجاهزية للإنتاج'
    );
  END IF;

  -- إنشاء الطلب
  INSERT INTO b2f_investor_service_requests (
    tree_operation_id,
    farm_id,
    opportunity_id,
    contract_number,
    investor_account_id,
    investor_name,
    investor_phone,
    investor_email,
    service_type,
    request_details,
    investor_notes
  ) VALUES (
    p_operation_id,
    v_operation.farm_id,
    v_operation.opportunity_id,
    v_operation.contract_number,
    v_operation.investor_account_id,
    p_investor_name,
    p_investor_phone,
    p_investor_email,
    p_service_type,
    p_request_details,
    p_investor_notes
  ) RETURNING id INTO v_request_id;

  -- تسجيل في السجل
  INSERT INTO b2f_service_request_logs (
    request_id,
    action_type,
    description
  ) VALUES (
    v_request_id,
    'created',
    'تم إنشاء طلب ' || v_service_type.name_ar
  );

  RETURN json_build_object(
    'success', true,
    'requestId', v_request_id,
    'message', 'تم إرسال طلبك بنجاح. سنتواصل معك قريباً'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 5. دالة تحديث حالة الطلب
-- ===================================

CREATE OR REPLACE FUNCTION update_service_request_status(
  p_request_id uuid,
  p_new_status text,
  p_admin_notes text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_old_status text;
  v_admin_name text;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- جلب الحالة القديمة
  SELECT status INTO v_old_status
  FROM b2f_investor_service_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  -- تحديث الطلب
  UPDATE b2f_investor_service_requests
  SET
    status = p_new_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    rejection_reason = p_rejection_reason,
    processing_started_at = CASE 
      WHEN p_new_status = 'processing' AND processing_started_at IS NULL 
      THEN now() 
      ELSE processing_started_at 
    END,
    processing_completed_at = CASE 
      WHEN p_new_status IN ('completed', 'completed_special', 'rejected') 
      THEN now() 
      ELSE processing_completed_at 
    END,
    updated_at = now()
  WHERE id = p_request_id;

  -- تسجيل التغيير
  INSERT INTO b2f_service_request_logs (
    request_id,
    action_type,
    old_status,
    new_status,
    description
  ) VALUES (
    p_request_id,
    'status_changed',
    v_old_status,
    p_new_status,
    'تم تغيير حالة الطلب من ' || v_old_status || ' إلى ' || p_new_status
  );

  RETURN json_build_object(
    'success', true,
    'message', 'تم تحديث حالة الطلب بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 6. دالة الحصول على طلبات المستثمر
-- ===================================

CREATE OR REPLACE FUNCTION get_investor_service_requests(p_phone text)
RETURNS json AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', r.id,
        'serviceType', r.service_type,
        'serviceTypeName', st.name_ar,
        'status', r.status,
        'contractNumber', r.contract_number,
        'requestDetails', r.request_details,
        'investorNotes', r.investor_notes,
        'adminNotes', r.admin_notes,
        'createdAt', r.created_at,
        'farm', json_build_object(
          'name', f.name,
          'city', f.city
        )
      )
    )
    FROM b2f_investor_service_requests r
    JOIN b2f_service_types st ON st.id = r.service_type
    JOIN b2f_farms f ON f.id = r.farm_id
    WHERE r.investor_phone = p_phone
    ORDER BY r.created_at DESC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 7. Trigger للتحديث التلقائي
-- ===================================

CREATE OR REPLACE FUNCTION update_service_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_service_request_timestamp ON b2f_investor_service_requests;
CREATE TRIGGER trigger_update_service_request_timestamp
  BEFORE UPDATE ON b2f_investor_service_requests
  FOR EACH ROW EXECUTE FUNCTION update_service_request_timestamp();

-- ===================================
-- 8. إحصائيات خدمة المستثمر
-- ===================================

CREATE OR REPLACE FUNCTION get_investor_service_stats()
RETURNS json AS $$
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  RETURN json_build_object(
    'total', (SELECT COUNT(*) FROM b2f_investor_service_requests),
    'new', (SELECT COUNT(*) FROM b2f_investor_service_requests WHERE status = 'new'),
    'processing', (SELECT COUNT(*) FROM b2f_investor_service_requests WHERE status = 'processing'),
    'completed', (SELECT COUNT(*) FROM b2f_investor_service_requests WHERE status IN ('completed', 'completed_special')),
    'byType', (
      SELECT json_object_agg(service_type, count)
      FROM (
        SELECT service_type, COUNT(*) as count
        FROM b2f_investor_service_requests
        GROUP BY service_type
      ) types
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 9. تعليقات توضيحية
-- ===================================

COMMENT ON TABLE b2f_service_types IS 'أنواع خدمات المستثمر المتاحة';
COMMENT ON TABLE b2f_investor_service_requests IS 'طلبات خدمة المستثمر - الواجهة الإنسانية بعد التشغيل';
COMMENT ON TABLE b2f_service_request_logs IS 'سجل معالجة طلبات الخدمة';

COMMENT ON FUNCTION create_investor_service_request IS 'إنشاء طلب خدمة جديد مع التحقق من الجاهزية';
COMMENT ON FUNCTION update_service_request_status IS 'تحديث حالة طلب الخدمة';
COMMENT ON FUNCTION get_investor_service_requests IS 'جلب جميع طلبات المستثمر';
COMMENT ON FUNCTION get_investor_service_stats IS 'إحصائيات قسم خدمة المستثمر';
