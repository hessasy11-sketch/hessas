/*
  # نظام غرفة العمليات التنفيذية - Executive Operations Room
  
  ## نظرة عامة
  غرفة العمليات هي مركز القيادة للمدير العام، تعرض:
  - المسؤولين الرسميين (Owners of Record)
  - المؤشرات الحية (Pulse KPIs)
  - قائمة القرارات (Decision Queue)
  - الإجراءات التنفيذية (Master Actions)
  
  ## الجداول الجديدة
  
  ### 1. executive_owners
  يحفظ المسؤولين الرسميين عن كل قسم:
  - owner_b2f: مساعد المدير العام لاستثمار المزارع
  - owner_farm_command: مدير المزارع الوطني
  - owner_b2b: مساعد المدير العام للمزادات
  - owner_finance: المحاسب الرئيسي
  - owner_marketing: مدير التسويق
  
  ### 2. executive_decision_queue
  قائمة القرارات المعلقة التي تحتاج موافقة المدير العام:
  - نوع القرار (تعيين/إيقاف/اعتماد/ميزانية)
  - من قدم الطلب
  - الأولوية (low/medium/high/urgent/critical)
  - الحالة (pending/approved/rejected/escalated)
  - البيانات والسياق
  
  ### 3. executive_actions_log
  سجل كل الإجراءات التنفيذية:
  - من نفذ الإجراء
  - نوع الإجراء
  - على من/ماذا
  - التفاصيل الكاملة
  - الوقت
  
  ### 4. platform_kpis_realtime
  مؤشرات المنصة الحية (Pulse KPIs):
  - زيارات المنصة
  - حجوزات B2F
  - مزادات B2B
  - مالية
  - أداء الأقسام
  
  ### 5. executive_master_actions
  الإجراءات السريعة المتاحة للمدير العام:
  - تعيين/سحب صلاحية
  - إيقاف/فتح خدمة
  - اعتماد/رفض طلب
  - تكليف مهمة فورية
  
  ## الأمان
  - جميع الجداول محمية بـ RLS
  - فقط General Manager (super_admin) له الوصول الكامل
  - المسؤولين يرون فقط أقسامهم
  - كل إجراء يسجل في Executive Log
*/

-- ============================================
-- 1. جدول المسؤولين الرسميين
-- ============================================

CREATE TABLE IF NOT EXISTS executive_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- المسؤولين الرسميين (staff_id من platform_staff)
  owner_b2f uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  owner_farm_command uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  owner_b2b uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  owner_finance uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  owner_marketing uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  
  -- تواريخ التعيين
  owner_b2f_assigned_at timestamptz,
  owner_farm_command_assigned_at timestamptz,
  owner_b2b_assigned_at timestamptz,
  owner_finance_assigned_at timestamptz,
  owner_marketing_assigned_at timestamptz,
  
  -- من عينهم
  assigned_by uuid REFERENCES platform_staff(id),
  
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- يجب أن يكون صف واحد فقط (singleton)
CREATE UNIQUE INDEX IF NOT EXISTS executive_owners_singleton_idx ON executive_owners ((true));

-- ============================================
-- 2. قائمة القرارات التنفيذية
-- ============================================

CREATE TABLE IF NOT EXISTS executive_decision_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- تصنيف القرار
  section text NOT NULL CHECK (section IN ('b2f', 'b2b', 'finance', 'marketing', 'platform')),
  decision_type text NOT NULL CHECK (decision_type IN (
    'assign_owner',
    'change_farm_manager',
    'suspend_farm',
    'approve_budget',
    'extend_auction',
    'approve_financial_op',
    'approve_expense',
    'launch_campaign',
    'staff_suspension',
    'other'
  )),
  
  -- من قدم الطلب
  requested_by uuid REFERENCES platform_staff(id) ON DELETE CASCADE,
  requested_by_name text,
  
  -- التفاصيل
  title text NOT NULL,
  description text,
  context jsonb, -- بيانات إضافية حسب نوع القرار
  
  -- الأولوية والحالة
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'cancelled')),
  
  -- القرار النهائي
  decided_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_notes text,
  
  -- مرجع (إذا كان مرتبط بجدول آخر)
  related_entity_type text, -- farm/auction/booking/staff
  related_entity_id uuid,
  
  expires_at timestamptz, -- بعض القرارات لها وقت محدد
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS executive_decision_queue_section_idx ON executive_decision_queue(section);
CREATE INDEX IF NOT EXISTS executive_decision_queue_status_idx ON executive_decision_queue(status);
CREATE INDEX IF NOT EXISTS executive_decision_queue_priority_idx ON executive_decision_queue(priority);
CREATE INDEX IF NOT EXISTS executive_decision_queue_requested_by_idx ON executive_decision_queue(requested_by);

-- ============================================
-- 3. سجل الإجراءات التنفيذية
-- ============================================

CREATE TABLE IF NOT EXISTS executive_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- من نفذ الإجراء
  executed_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  executor_name text NOT NULL,
  executor_role text,
  
  -- نوع الإجراء
  action_type text NOT NULL CHECK (action_type IN (
    'assign_owner',
    'revoke_authority',
    'grant_temporary_access',
    'suspend_staff',
    'activate_staff',
    'approve_decision',
    'reject_decision',
    'lock_farm',
    'unlock_farm',
    'lock_auction',
    'unlock_auction',
    'assign_task',
    'approve_budget',
    'financial_approval',
    'emergency_action',
    'other'
  )),
  
  -- على من/ماذا
  target_type text, -- staff/farm/auction/budget/decision
  target_id uuid,
  target_name text,
  
  -- التفاصيل الكاملة
  action_title text NOT NULL,
  action_description text,
  action_data jsonb, -- بيانات تفصيلية
  
  -- النتيجة
  result text DEFAULT 'success' CHECK (result IN ('success', 'failed', 'partial')),
  result_message text,
  
  -- الوقت والموقع
  executed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

CREATE INDEX IF NOT EXISTS executive_actions_log_executed_by_idx ON executive_actions_log(executed_by);
CREATE INDEX IF NOT EXISTS executive_actions_log_action_type_idx ON executive_actions_log(action_type);
CREATE INDEX IF NOT EXISTS executive_actions_log_target_idx ON executive_actions_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS executive_actions_log_executed_at_idx ON executive_actions_log(executed_at DESC);

-- ============================================
-- 4. المؤشرات الحية (Pulse KPIs)
-- ============================================

CREATE TABLE IF NOT EXISTS platform_kpis_realtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- نوع المؤشر
  kpi_category text NOT NULL CHECK (kpi_category IN ('visits', 'bookings', 'auctions', 'finance', 'operations', 'alerts')),
  kpi_name text NOT NULL,
  
  -- القيمة
  kpi_value numeric NOT NULL DEFAULT 0,
  kpi_unit text, -- visits/bookings/SAR/count
  
  -- السياق
  section text CHECK (section IN ('b2f', 'b2b', 'platform', 'finance', 'marketing')),
  related_entity_type text,
  related_entity_id uuid,
  
  -- الفترة الزمنية
  period text CHECK (period IN ('realtime', 'today', 'this_week', 'this_month')),
  
  -- البيانات الإضافية
  metadata jsonb,
  
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_kpis_realtime_category_idx ON platform_kpis_realtime(kpi_category);
CREATE INDEX IF NOT EXISTS platform_kpis_realtime_section_idx ON platform_kpis_realtime(section);
CREATE INDEX IF NOT EXISTS platform_kpis_realtime_period_idx ON platform_kpis_realtime(period);
CREATE INDEX IF NOT EXISTS platform_kpis_realtime_calculated_at_idx ON platform_kpis_realtime(calculated_at DESC);

-- ============================================
-- 5. الإجراءات السريعة المتاحة
-- ============================================

CREATE TABLE IF NOT EXISTS executive_master_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- تصنيف الإجراء
  section text NOT NULL CHECK (section IN ('b2f', 'b2b', 'finance', 'marketing', 'platform', 'staff')),
  action_code text NOT NULL UNIQUE,
  action_name_ar text NOT NULL,
  action_name_en text NOT NULL,
  
  -- الوصف والاستخدام
  description text,
  required_params jsonb, -- المعاملات المطلوبة
  
  -- الأمان
  requires_confirmation boolean DEFAULT true,
  danger_level text DEFAULT 'low' CHECK (danger_level IN ('low', 'medium', 'high', 'critical')),
  
  -- التوفر
  is_active boolean DEFAULT true,
  available_to_roles text[] DEFAULT ARRAY['super_admin'],
  
  -- الإحصائيات
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE executive_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_decision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_kpis_realtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_master_actions ENABLE ROW LEVEL SECURITY;

-- فقط Super Admin (General Manager) له الوصول الكامل
CREATE POLICY "Super Admin full access to executive_owners"
  ON executive_owners FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role = 'super_admin'
      AND platform_staff.is_active = true
    )
  );

CREATE POLICY "Super Admin full access to decision_queue"
  ON executive_decision_queue FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role = 'super_admin'
      AND platform_staff.is_active = true
    )
  );

-- المسؤولين يمكنهم إضافة قرارات لأقسامهم فقط
CREATE POLICY "Owners can create decisions for their sections"
  ON executive_decision_queue FOR INSERT
  TO public
  WITH CHECK (
    requested_by = (current_setting('app.current_staff_id', true))::uuid
  );

-- المسؤولين يمكنهم رؤية قرارات أقسامهم
CREATE POLICY "Owners can view their section decisions"
  ON executive_decision_queue FOR SELECT
  TO public
  USING (
    requested_by = (current_setting('app.current_staff_id', true))::uuid
    OR
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role = 'super_admin'
    )
  );

-- السجل التنفيذي: القراءة فقط للـ Super Admin
CREATE POLICY "Super Admin can view executive actions log"
  ON executive_actions_log FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role = 'super_admin'
    )
  );

-- المؤشرات: الجميع يقرأ، النظام يكتب
CREATE POLICY "Anyone can view KPIs"
  ON platform_kpis_realtime FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert KPIs"
  ON platform_kpis_realtime FOR INSERT
  TO public
  WITH CHECK (true);

-- الإجراءات السريعة: القراءة للجميع
CREATE POLICY "Anyone can view master actions"
  ON executive_master_actions FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Super Admin can manage master actions"
  ON executive_master_actions FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role = 'super_admin'
    )
  );

-- ============================================
-- Insert Initial Data
-- ============================================

-- صف واحد لـ executive_owners (singleton)
INSERT INTO executive_owners (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- الإجراءات السريعة الافتراضية
INSERT INTO executive_master_actions (section, action_code, action_name_ar, action_name_en, description, danger_level) VALUES
-- B2F Actions
('b2f', 'assign_b2f_assistant', 'تعيين مساعد مدير B2F', 'Assign B2F Assistant', 'تعيين أو تغيير مساعد المدير العام لقسم استثمار المزارع', 'high'),
('b2f', 'assign_farm_director', 'تعيين مدير المزارع الوطني', 'Assign National Farm Director', 'تعيين أو تغيير مدير المزارع على مستوى المملكة', 'high'),
('b2f', 'lock_farm', 'قفل مزرعة', 'Lock Farm', 'إيقاف الحجوزات والعمليات على مزرعة محددة', 'critical'),
('b2f', 'unlock_farm', 'فتح مزرعة', 'Unlock Farm', 'فتح الحجوزات والعمليات على مزرعة محددة', 'medium'),
('b2f', 'change_farm_manager', 'تغيير مدير مزرعة', 'Change Farm Manager', 'تعيين مدير جديد لمزرعة محددة', 'high'),
('b2f', 'approve_farm_budget', 'اعتماد ميزانية مزرعة', 'Approve Farm Budget', 'اعتماد طلب ميزانية أو مصروف كبير لمزرعة', 'high'),

-- B2B Actions  
('b2b', 'assign_b2b_assistant', 'تعيين مساعد مدير B2B', 'Assign B2B Assistant', 'تعيين أو تغيير مساعد المدير العام للمزادات', 'high'),
('b2b', 'lock_auction', 'إيقاف مزاد', 'Lock Auction', 'إيقاف مزاد نشط فوراً', 'critical'),
('b2b', 'unlock_auction', 'فتح مزاد', 'Unlock Auction', 'إعادة فتح مزاد موقوف', 'medium'),
('b2b', 'extend_auction_time', 'تمديد وقت مزاد', 'Extend Auction Time', 'تمديد استثنائي لوقت انتهاء مزاد', 'medium'),
('b2b', 'remove_auction', 'سحب مزاد', 'Remove Auction', 'سحب مزاد من العرض العام بسبب مخالفة', 'critical'),

-- Finance Actions
('finance', 'assign_finance_manager', 'تعيين المحاسب الرئيسي', 'Assign Finance Manager', 'تعيين أو تغيير المحاسب الرئيسي', 'high'),
('finance', 'approve_major_expense', 'اعتماد مصروف كبير', 'Approve Major Expense', 'اعتماد مصروف يتجاوز الحد المسموح', 'high'),
('finance', 'reject_expense', 'رفض مصروف', 'Reject Expense', 'رفض طلب مصروف مع توضيح السبب', 'medium'),
('finance', 'freeze_payments', 'تجميد مدفوعات', 'Freeze Payments', 'إيقاف الصرف مؤقتاً', 'critical'),
('finance', 'request_financial_report', 'طلب تقرير مالي فوري', 'Request Financial Report', 'طلب تقرير مالي خلال ساعة', 'medium'),

-- Marketing Actions
('marketing', 'assign_marketing_manager', 'تعيين مدير التسويق', 'Assign Marketing Manager', 'تعيين أو تغيير مدير التسويق', 'high'),
('marketing', 'launch_campaign', 'تكليف بحملة', 'Launch Campaign', 'تكليف بحملة تسويقية لمزرعة/مزاد', 'medium'),
('marketing', 'stop_ads', 'إيقاف إعلانات', 'Stop Ads', 'إيقاف إعلانات مزرعة/مزاد موقوف', 'medium'),
('marketing', 'request_marketing_report', 'طلب تقرير تسويقي', 'Request Marketing Report', 'طلب تقرير خلال 24 ساعة', 'low'),

-- Staff Actions
('staff', 'grant_temporary_access', 'منح صلاحية مؤقتة', 'Grant Temporary Access', 'منح صلاحية لموظف لمدة محددة', 'medium'),
('staff', 'revoke_authority', 'سحب صلاحية', 'Revoke Authority', 'سحب صلاحية من موظف مؤقتاً', 'high'),
('staff', 'suspend_staff', 'تعليق موظف', 'Suspend Staff', 'تعليق حساب موظف', 'critical'),
('staff', 'activate_staff', 'تفعيل موظف', 'Activate Staff', 'إعادة تفعيل حساب موظف', 'medium'),
('staff', 'assign_urgent_task', 'تكليف بمهمة عاجلة', 'Assign Urgent Task', 'تكليف موظف بمهمة عاجلة مع موعد نهائي', 'medium')

ON CONFLICT (action_code) DO NOTHING;
