/*
  # المرحلة 4: نظام صلاحيات القرارات (Decision Authority System)
  
  1. جدول decision_authorities:
    - ربط نوع القرار بالأدوار المسموح لها
    - دعم شروط إضافية (مثل: المبلغ، الأولوية)
  
  2. دوال التحقق:
    - can_approve_decision() - هل يستطيع هذا الموظف اعتماد القرار؟
    - get_decision_authorities() - جلب صلاحيات قرار معين
    - add_decision_authority() - إضافة صلاحية
    - remove_decision_authority() - إزالة صلاحية
  
  3. التكامل:
    - تحديث approve_decision_b2f للتحقق من الصلاحيات
*/

-- =======================
-- 1. جدول صلاحيات القرارات
-- =======================
CREATE TABLE IF NOT EXISTS decision_authorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- نوع القرار
  decision_type text NOT NULL,
  
  -- الدور المسموح له
  allowed_role text NOT NULL,
  
  -- شروط إضافية (optional)
  conditions jsonb DEFAULT '{}'::jsonb,
  -- مثال: {"max_amount": 5000, "priority": ["urgent", "high"]}
  
  -- الوصف
  description_ar text,
  description_en text,
  
  -- معلومات إضافية
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- منع التكرار
  UNIQUE(decision_type, allowed_role, conditions)
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_decision_authorities_type ON decision_authorities(decision_type);
CREATE INDEX IF NOT EXISTS idx_decision_authorities_role ON decision_authorities(allowed_role);
CREATE INDEX IF NOT EXISTS idx_decision_authorities_active ON decision_authorities(is_active);

-- RLS
ALTER TABLE decision_authorities ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - الجميع
CREATE POLICY "Anyone can read decision_authorities"
  ON decision_authorities FOR SELECT
  USING (true);

-- سياسة الكتابة - المسؤولون فقط
CREATE POLICY "Admins can manage decision_authorities"
  ON decision_authorities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =======================
-- 2. إدراج الصلاحيات الافتراضية
-- =======================
INSERT INTO decision_authorities (decision_type, allowed_role, conditions, description_ar, description_en) VALUES
  -- إيقاف مزرعة → GM فقط
  ('suspend_bookings', 'super_admin', '{}', 'المدير العام فقط يمكنه إيقاف المزارع', 'Only GM can suspend farms'),
  
  -- اعتماد مصروف صغير (< 5000) → مساعد B2F + GM
  ('approve_expense', 'b2f_assistant', '{"max_amount": 5000}', 'مساعد B2F يمكنه اعتماد المصروفات حتى 5000 ر.س', 'B2F Assistant can approve expenses up to 5000 SAR'),
  ('approve_expense', 'super_admin', '{}', 'المدير العام يمكنه اعتماد أي مصروف', 'GM can approve any expense'),
  
  -- تغيير مدير مزرعة → GM فقط
  ('change_farm_manager', 'super_admin', '{}', 'المدير العام فقط يمكنه تغيير مديري المزارع', 'Only GM can change farm managers'),
  
  -- إلغاء مزاد → GM + مدير B2B
  ('cancel_auction', 'super_admin', '{}', 'المدير العام يمكنه إلغاء أي مزاد', 'GM can cancel any auction'),
  ('cancel_auction', 'b2b_manager', '{}', 'مدير B2B يمكنه إلغاء المزادات', 'B2B Manager can cancel auctions')
ON CONFLICT (decision_type, allowed_role, conditions) DO NOTHING;

-- =======================
-- 3. دالة: التحقق من صلاحية الاعتماد
-- =======================
CREATE OR REPLACE FUNCTION can_approve_decision(
  p_decision_id uuid,
  p_staff_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision record;
  v_staff_role text;
  v_has_authority boolean := false;
  v_matching_authority record;
BEGIN
  -- جلب بيانات القرار
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_approve', false,
      'reason', 'Decision not found'
    );
  END IF;
  
  -- جلب دور الموظف
  SELECT role INTO v_staff_role
  FROM platform_staff
  WHERE id = p_staff_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_approve', false,
      'reason', 'Staff not found'
    );
  END IF;
  
  -- البحث عن صلاحية مطابقة
  FOR v_matching_authority IN
    SELECT *
    FROM decision_authorities
    WHERE decision_type = v_decision.decision_type
    AND allowed_role = v_staff_role
    AND is_active = true
  LOOP
    -- التحقق من الشروط الإضافية
    IF v_matching_authority.conditions = '{}'::jsonb THEN
      -- لا توجد شروط - صلاحية كاملة
      v_has_authority := true;
      EXIT;
    ELSE
      -- التحقق من الشروط
      -- مثال: max_amount للمصروفات
      IF v_matching_authority.conditions ? 'max_amount' THEN
        IF v_decision.action_data ? 'amount' THEN
          IF (v_decision.action_data->>'amount')::numeric <= (v_matching_authority.conditions->>'max_amount')::numeric THEN
            v_has_authority := true;
            EXIT;
          END IF;
        END IF;
      ELSE
        -- شروط أخرى يمكن إضافتها هنا
        v_has_authority := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'can_approve', v_has_authority,
    'staff_role', v_staff_role,
    'decision_type', v_decision.decision_type,
    'reason', CASE 
      WHEN v_has_authority THEN 'Has authority'
      ELSE 'No matching authority rule found'
    END
  );
END;
$$;

-- =======================
-- 4. دالة: جلب صلاحيات قرار معين
-- =======================
CREATE OR REPLACE FUNCTION get_decision_authorities(p_decision_type text)
RETURNS TABLE (
  id uuid,
  decision_type text,
  allowed_role text,
  conditions jsonb,
  description_ar text,
  description_en text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.decision_type,
    da.allowed_role,
    da.conditions,
    da.description_ar,
    da.description_en,
    da.is_active
  FROM decision_authorities da
  WHERE da.decision_type = p_decision_type
  AND da.is_active = true
  ORDER BY 
    CASE da.allowed_role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      ELSE 3
    END,
    da.allowed_role;
END;
$$;

-- =======================
-- 5. دالة: إضافة صلاحية
-- =======================
CREATE OR REPLACE FUNCTION add_decision_authority(
  p_decision_type text,
  p_allowed_role text,
  p_conditions jsonb DEFAULT '{}'::jsonb,
  p_description_ar text DEFAULT NULL,
  p_description_en text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_authority_id uuid;
BEGIN
  -- إدراج أو تحديث
  INSERT INTO decision_authorities (
    decision_type,
    allowed_role,
    conditions,
    description_ar,
    description_en,
    created_by,
    is_active
  ) VALUES (
    p_decision_type,
    p_allowed_role,
    p_conditions,
    p_description_ar,
    p_description_en,
    p_created_by,
    true
  )
  ON CONFLICT (decision_type, allowed_role, conditions)
  DO UPDATE SET
    is_active = true,
    description_ar = COALESCE(EXCLUDED.description_ar, decision_authorities.description_ar),
    description_en = COALESCE(EXCLUDED.description_en, decision_authorities.description_en),
    updated_at = now()
  RETURNING id INTO v_authority_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'authority_id', v_authority_id,
    'message', 'Authority added successfully'
  );
END;
$$;

-- =======================
-- 6. دالة: إزالة صلاحية
-- =======================
CREATE OR REPLACE FUNCTION remove_decision_authority(p_authority_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تعطيل بدلاً من الحذف (soft delete)
  UPDATE decision_authorities
  SET 
    is_active = false,
    updated_at = now()
  WHERE id = p_authority_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Authority removed successfully'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authority not found'
    );
  END IF;
END;
$$;

-- =======================
-- 7. دالة: جلب جميع أنواع القرارات مع صلاحياتها
-- =======================
CREATE OR REPLACE FUNCTION get_all_decision_types_with_authorities()
RETURNS TABLE (
  decision_type text,
  decision_name_ar text,
  decision_name_en text,
  authorities jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH decision_types AS (
    SELECT DISTINCT da.decision_type
    FROM decision_authorities da
    WHERE da.is_active = true
  ),
  decision_names AS (
    SELECT 
      dt.decision_type,
      CASE dt.decision_type
        WHEN 'suspend_bookings' THEN 'إيقاف حجوزات مزرعة'
        WHEN 'approve_expense' THEN 'اعتماد مصروف'
        WHEN 'change_farm_manager' THEN 'تغيير مدير مزرعة'
        WHEN 'cancel_auction' THEN 'إلغاء مزاد'
        ELSE dt.decision_type
      END as name_ar,
      CASE dt.decision_type
        WHEN 'suspend_bookings' THEN 'Suspend Farm Bookings'
        WHEN 'approve_expense' THEN 'Approve Expense'
        WHEN 'change_farm_manager' THEN 'Change Farm Manager'
        WHEN 'cancel_auction' THEN 'Cancel Auction'
        ELSE dt.decision_type
      END as name_en
    FROM decision_types dt
  )
  SELECT 
    dn.decision_type,
    dn.name_ar,
    dn.name_en,
    jsonb_agg(
      jsonb_build_object(
        'id', da.id,
        'allowed_role', da.allowed_role,
        'conditions', da.conditions,
        'description_ar', da.description_ar,
        'description_en', da.description_en
      )
      ORDER BY 
        CASE da.allowed_role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          ELSE 3
        END
    ) as authorities
  FROM decision_names dn
  LEFT JOIN decision_authorities da 
    ON da.decision_type = dn.decision_type
    AND da.is_active = true
  GROUP BY dn.decision_type, dn.name_ar, dn.name_en
  ORDER BY dn.decision_type;
END;
$$;
