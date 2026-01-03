/*
  # نظام المجموعات الكامل - Group-Based Investment System
  
  ## التغييرات الرئيسية
  
  1. **نظام قوائم الانتظار (Waiting Lists)**
     - جدول `b2f_investment_groups` لإدارة المجموعات
     - حد أقصى لكل مجموعة
     - إغلاق تلقائي عند الاكتمال
  
  2. **تحديث حالات الطلبات**
     - waiting_in_group: في قائمة الانتظار
     - group_full_pending_payment: المجموعة مكتملة - ينتظر فتح الدفع
     - payment_open: الدفع مفتوح الآن
     - receipt_uploaded_ai_review: رفع إيصال - مراجعة AI
     - receipt_duplicate_financial_review: إيصال متطابق - المراجعة المالية
     - receipt_approved_pending_invoice: معتمد - ينتظر الفاتورة
     - invoice_issued: تم إصدار الفاتورة
     - contract_issued: تم إصدار العقد
     - operational: تم التحويل للتشغيل
  
  3. **نظام الإيصالات المتطابقة**
     - جدول `b2f_duplicate_receipts` لتتبع التطابقات
  
  4. **نظام الفواتير**
     - جدول `b2f_invoices` لإصدار الفواتير بعد اعتماد الإيصالات
  
  5. **ضوابط صارمة**
     - لا يمكن رفع إيصال إلا بعد فتح الدفع من الإدارة
     - لا يمكن إصدار عقد إلا بعد اعتماد الدفع وإصدار الفاتورة
*/

-- الخطوة 1: إنشاء جدول لتحديد المسؤولين
CREATE TABLE IF NOT EXISTS b2f_admin_users (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE b2f_admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin users"
  ON b2f_admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM b2f_admin_users WHERE user_id = auth.uid())
  );

-- الخطوة 2: إنشاء جدول المجموعات الاستثمارية
CREATE TABLE IF NOT EXISTS b2f_investment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES b2f_opportunities(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  capacity integer NOT NULL DEFAULT 10,
  current_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  payment_opened_at timestamptz,
  payment_opened_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_group_status CHECK (status IN (
    'waiting',           -- قائمة انتظار مفتوحة
    'full',              -- مكتملة - ينتظر فتح الدفع
    'payment_open',      -- الدفع مفتوح
    'completed'          -- مكتملة
  )),
  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_current_count CHECK (current_count >= 0 AND current_count <= capacity)
);

-- الخطوة 3: تحديث جدول الطلبات ليشمل group_id
ALTER TABLE b2f_investment_requests 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES b2f_investment_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS position_in_group integer,
ADD COLUMN IF NOT EXISTS payment_allowed_at timestamptz;

-- الخطوة 4: تحديث القيود على حالة الطلبات
ALTER TABLE b2f_investment_requests 
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE b2f_investment_requests 
ADD CONSTRAINT valid_status CHECK (status IN (
  'pending',                              -- طلب جديد
  'waiting_in_group',                     -- في قائمة انتظار
  'group_full_pending_payment',           -- المجموعة مكتملة - ينتظر فتح الدفع
  'payment_open',                         -- الدفع مفتوح الآن - يمكن رفع الإيصال
  'receipt_uploaded_ai_review',           -- رفع إيصال - مراجعة AI
  'receipt_duplicate_financial_review',   -- إيصال متطابق - مراجعة مالية
  'receipt_approved_pending_invoice',     -- معتمد - ينتظر إصدار الفاتورة
  'invoice_issued',                       -- تم إصدار الفاتورة
  'contract_issued',                      -- تم إصدار العقد
  'operational',                          -- تم التحويل للتشغيل
  'rejected',                             -- مرفوض
  'cancelled'                             -- ملغي
));

-- الخطوة 5: إنشاء جدول الإيصالات المتطابقة
CREATE TABLE IF NOT EXISTS b2f_duplicate_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_url text NOT NULL,
  original_request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  duplicate_request_ids uuid[] NOT NULL DEFAULT '{}',
  total_duplicates integer NOT NULL DEFAULT 0,
  financial_review_status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_financial_review_status CHECK (financial_review_status IN (
    'pending',      -- ينتظر المراجعة المالية
    'approved',     -- معتمد
    'rejected'      -- مرفوض
  ))
);

-- الخطوة 6: إنشاء جدول الفواتير
CREATE TABLE IF NOT EXISTS b2f_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  amount decimal(10,2) NOT NULL,
  issued_at timestamptz DEFAULT now(),
  issued_by uuid REFERENCES profiles(id),
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_amount CHECK (amount > 0)
);

-- الخطوة 7: تعديل جدول العقود لإضافة invoice_id
ALTER TABLE b2f_contracts 
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES b2f_invoices(id) ON DELETE SET NULL;

-- الخطوة 8: RLS Policies للجداول الجديدة

-- سياسات b2f_investment_groups
ALTER TABLE b2f_investment_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view investment groups" ON b2f_investment_groups;
CREATE POLICY "Public can view investment groups"
  ON b2f_investment_groups FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can manage groups" ON b2f_investment_groups;
CREATE POLICY "Admins can manage groups"
  ON b2f_investment_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM b2f_admin_users WHERE user_id = auth.uid())
  );

-- سياسات b2f_duplicate_receipts
ALTER TABLE b2f_duplicate_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view duplicate receipts" ON b2f_duplicate_receipts;
CREATE POLICY "Admins can view duplicate receipts"
  ON b2f_duplicate_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM b2f_admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage duplicate receipts" ON b2f_duplicate_receipts;
CREATE POLICY "Admins can manage duplicate receipts"
  ON b2f_duplicate_receipts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM b2f_admin_users WHERE user_id = auth.uid())
  );

-- سياسات b2f_invoices
ALTER TABLE b2f_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Investors can view their invoices" ON b2f_invoices;
CREATE POLICY "Investors can view their invoices"
  ON b2f_invoices FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investment_requests 
      WHERE b2f_investment_requests.id = b2f_invoices.request_id
      AND (
        b2f_investment_requests.investor_phone = current_setting('request.headers', true)::json->>'x-investor-phone'
        OR b2f_investment_requests.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can manage invoices" ON b2f_invoices;
CREATE POLICY "Admins can manage invoices"
  ON b2f_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM b2f_admin_users WHERE user_id = auth.uid())
  );

-- الخطوة 9: Trigger لإغلاق المجموعة تلقائياً عند الاكتمال
CREATE OR REPLACE FUNCTION auto_close_group_on_full()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا وصلت المجموعة للحد الأقصى، تحديث حالتها إلى 'full'
  IF NEW.current_count >= NEW.capacity AND NEW.status = 'waiting' THEN
    NEW.status = 'full';
    NEW.updated_at = now();
    
    -- تحديث جميع الطلبات في هذه المجموعة إلى 'group_full_pending_payment'
    UPDATE b2f_investment_requests
    SET status = 'group_full_pending_payment',
        updated_at = now()
    WHERE group_id = NEW.id 
    AND status = 'waiting_in_group';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_close_group ON b2f_investment_groups;
CREATE TRIGGER trigger_auto_close_group
  BEFORE UPDATE ON b2f_investment_groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_group_on_full();

-- الخطوة 10: Trigger لزيادة عدد المجموعة عند إضافة طلب
CREATE OR REPLACE FUNCTION increment_group_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_id IS NOT NULL AND NEW.status = 'waiting_in_group' THEN
    UPDATE b2f_investment_groups
    SET current_count = current_count + 1,
        updated_at = now()
    WHERE id = NEW.group_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_group_count ON b2f_investment_requests;
CREATE TRIGGER trigger_increment_group_count
  AFTER INSERT OR UPDATE ON b2f_investment_requests
  FOR EACH ROW
  WHEN (NEW.group_id IS NOT NULL AND NEW.status = 'waiting_in_group')
  EXECUTE FUNCTION increment_group_count();

-- الخطوة 11: Trigger لمنع رفع الإيصال قبل فتح الدفع
CREATE OR REPLACE FUNCTION validate_payment_open_before_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا كان المستخدم يحاول رفع إيصال
  IF NEW.payment_receipt_url IS NOT NULL AND (OLD.payment_receipt_url IS NULL OR OLD.payment_receipt_url != NEW.payment_receipt_url) THEN
    -- التحقق من أن حالة المجموعة هي 'payment_open'
    IF NEW.group_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM b2f_investment_groups
      WHERE id = NEW.group_id 
      AND status = 'payment_open'
    ) THEN
      RAISE EXCEPTION 'لا يمكن رفع الإيصال قبل فتح الدفع من الإدارة';
    END IF;
    
    -- التحقق من أن حالة الطلب هي 'payment_open' على الأقل
    IF NEW.status NOT IN ('payment_open', 'receipt_uploaded_ai_review', 'receipt_duplicate_financial_review') THEN
      RAISE EXCEPTION 'حالة الطلب يجب أن تكون "payment_open" لرفع الإيصال';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_payment_open ON b2f_investment_requests;
CREATE TRIGGER trigger_validate_payment_open
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_open_before_receipt();

-- الخطوة 12: Trigger لمنع إصدار العقد قبل إصدار الفاتورة
CREATE OR REPLACE FUNCTION validate_invoice_before_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من أن الفاتورة موجودة قبل إصدار العقد
  IF NOT EXISTS (
    SELECT 1 FROM b2f_invoices
    WHERE request_id = NEW.request_id
  ) THEN
    RAISE EXCEPTION 'لا يمكن إصدار العقد قبل إصدار الفاتورة';
  END IF;
  
  -- التحقق من أن حالة الطلب هي 'invoice_issued' على الأقل
  IF NOT EXISTS (
    SELECT 1 FROM b2f_investment_requests
    WHERE id = NEW.request_id 
    AND status IN ('invoice_issued', 'contract_issued', 'operational')
  ) THEN
    RAISE EXCEPTION 'لا يمكن إصدار العقد قبل اعتماد الدفع وإصدار الفاتورة';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_invoice_before_contract ON b2f_contracts;
CREATE TRIGGER trigger_validate_invoice_before_contract
  BEFORE INSERT ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_before_contract();

-- الخطوة 13: حذف/تعطيل أي triggers قديمة تتعارض مع النظام الجديد
DROP TRIGGER IF EXISTS auto_transfer_to_operations ON b2f_investment_requests;
DROP TRIGGER IF EXISTS auto_generate_contract_on_payment ON b2f_investment_requests;
DROP TRIGGER IF EXISTS auto_issue_certificate_on_contract ON b2f_contracts;

-- الخطوة 14: إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_groups_opportunity ON b2f_investment_groups(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_groups_status ON b2f_investment_groups(status);
CREATE INDEX IF NOT EXISTS idx_requests_group ON b2f_investment_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_invoices_request ON b2f_invoices(request_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_receipts_url ON b2f_duplicate_receipts(receipt_url);

-- الخطوة 15: دالة لفتح الدفع للمجموعة من الإدارة
CREATE OR REPLACE FUNCTION open_payment_for_group(
  p_group_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_group_status text;
  v_updated_count integer;
BEGIN
  -- التحقق من أن المستخدم admin
  IF NOT EXISTS (
    SELECT 1 FROM b2f_admin_users WHERE user_id = p_admin_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'غير مصرح لك بهذه العملية'
    );
  END IF;
  
  -- التحقق من حالة المجموعة
  SELECT status INTO v_group_status
  FROM b2f_investment_groups
  WHERE id = p_group_id;
  
  IF v_group_status IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المجموعة غير موجودة'
    );
  END IF;
  
  IF v_group_status != 'full' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المجموعة يجب أن تكون مكتملة لفتح الدفع'
    );
  END IF;
  
  -- فتح الدفع للمجموعة
  UPDATE b2f_investment_groups
  SET status = 'payment_open',
      payment_opened_at = now(),
      payment_opened_by = p_admin_id,
      updated_at = now()
  WHERE id = p_group_id;
  
  -- تحديث جميع الطلبات في المجموعة
  UPDATE b2f_investment_requests
  SET status = 'payment_open',
      payment_allowed_at = now(),
      updated_at = now()
  WHERE group_id = p_group_id 
  AND status = 'group_full_pending_payment';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم فتح الدفع للمجموعة بنجاح',
    'updated_requests', v_updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 16: دالة للكشف عن الإيصالات المتطابقة
CREATE OR REPLACE FUNCTION detect_duplicate_receipt(
  p_receipt_url text,
  p_request_id uuid
)
RETURNS json AS $$
DECLARE
  v_existing_request_id uuid;
  v_duplicate_record_id uuid;
BEGIN
  -- البحث عن إيصال مطابق
  SELECT id INTO v_existing_request_id
  FROM b2f_investment_requests
  WHERE payment_receipt_url = p_receipt_url
  AND id != p_request_id
  AND status NOT IN ('rejected', 'cancelled')
  LIMIT 1;
  
  -- إذا وُجد تطابق
  IF v_existing_request_id IS NOT NULL THEN
    -- التحقق من وجود سجل تطابق
    SELECT id INTO v_duplicate_record_id
    FROM b2f_duplicate_receipts
    WHERE receipt_url = p_receipt_url;
    
    IF v_duplicate_record_id IS NULL THEN
      -- إنشاء سجل جديد
      INSERT INTO b2f_duplicate_receipts (
        receipt_url,
        original_request_id,
        duplicate_request_ids,
        total_duplicates
      ) VALUES (
        p_receipt_url,
        v_existing_request_id,
        ARRAY[p_request_id],
        1
      ) RETURNING id INTO v_duplicate_record_id;
    ELSE
      -- تحديث السجل الموجود
      UPDATE b2f_duplicate_receipts
      SET duplicate_request_ids = array_append(duplicate_request_ids, p_request_id),
          total_duplicates = total_duplicates + 1
      WHERE id = v_duplicate_record_id;
    END IF;
    
    -- تحديث حالة الطلب الحالي
    UPDATE b2f_investment_requests
    SET status = 'receipt_duplicate_financial_review',
        updated_at = now()
    WHERE id = p_request_id;
    
    RETURN json_build_object(
      'is_duplicate', true,
      'duplicate_record_id', v_duplicate_record_id,
      'original_request_id', v_existing_request_id
    );
  END IF;
  
  -- لا يوجد تطابق - تحديث الحالة للمراجعة العادية
  UPDATE b2f_investment_requests
  SET status = 'receipt_uploaded_ai_review',
      updated_at = now()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'is_duplicate', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 17: دالة لإصدار الفاتورة بعد اعتماد الإيصال
CREATE OR REPLACE FUNCTION issue_invoice_for_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_amount decimal
)
RETURNS json AS $$
DECLARE
  v_invoice_number text;
  v_invoice_id uuid;
  v_next_seq integer;
BEGIN
  -- التحقق من أن المستخدم admin
  IF NOT EXISTS (
    SELECT 1 FROM b2f_admin_users WHERE user_id = p_admin_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'غير مصرح لك بهذه العملية'
    );
  END IF;
  
  -- التحقق من أن الطلب في حالة 'receipt_approved_pending_invoice'
  IF NOT EXISTS (
    SELECT 1 FROM b2f_investment_requests
    WHERE id = p_request_id 
    AND status = 'receipt_approved_pending_invoice'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'حالة الطلب غير صحيحة لإصدار الفاتورة'
    );
  END IF;
  
  -- الحصول على التسلسل التالي
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-[0-9]+-([0-9]+)') AS INTEGER)), 0) + 1
  INTO v_next_seq
  FROM b2f_invoices
  WHERE invoice_number LIKE 'INV-' || TO_CHAR(now(), 'YYYYMMDD') || '-%';
  
  -- توليد رقم فاتورة فريد
  v_invoice_number := 'INV-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_next_seq::text, 6, '0');
  
  -- إصدار الفاتورة
  INSERT INTO b2f_invoices (
    request_id,
    invoice_number,
    amount,
    issued_by
  ) VALUES (
    p_request_id,
    v_invoice_number,
    p_amount,
    p_admin_id
  ) RETURNING id INTO v_invoice_id;
  
  -- تحديث حالة الطلب
  UPDATE b2f_investment_requests
  SET status = 'invoice_issued',
      updated_at = now()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 18: دالة لاعتماد الإيصال من المراجعة المالية
CREATE OR REPLACE FUNCTION approve_receipt_financial_review(
  p_request_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
BEGIN
  -- التحقق من أن المستخدم admin
  IF NOT EXISTS (
    SELECT 1 FROM b2f_admin_users WHERE user_id = p_admin_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'غير مصرح لك بهذه العملية'
    );
  END IF;
  
  -- تحديث حالة الطلب
  UPDATE b2f_investment_requests
  SET status = 'receipt_approved_pending_invoice',
      updated_at = now()
  WHERE id = p_request_id 
  AND status IN ('receipt_uploaded_ai_review', 'receipt_duplicate_financial_review');
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو في حالة غير صحيحة'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم اعتماد الإيصال بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
