/*
  # بوابة الدخول الذكية عبر زر التاج - المرحلة 1
  
  ## الهدف
  زر التاج = نقطة الدخول الوحيدة
  - لا تسجيل ذاتي
  - كل مستخدم يرى فقط ما يخص عمله
  - المدير العام يدخل كل شيء بلا حدود
  
  ## المرحلة 1
  - الهيكل + صلاحيات العرض فقط
  - لا Router Guards
  - لا منع مسارات
  - فقط عرض من يحق له الدخول على ماذا
*/

-- ===================================
-- جدول: Gateway Cards (البطاقات المتاحة)
-- ===================================
CREATE TABLE IF NOT EXISTS gateway_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات البطاقة
  card_key text UNIQUE NOT NULL,  -- مفتاح فريد للبطاقة (command_room, b2f, b2b...)
  title_ar text NOT NULL,         -- العنوان بالعربية
  title_en text,                  -- العنوان بالإنجليزية
  description_ar text,            -- الوصف بالعربية
  description_en text,            -- الوصف بالإنجليزية
  
  -- التصميم
  icon text NOT NULL,             -- اسم الأيقونة من lucide-react
  color text DEFAULT 'blue',      -- اللون الأساسي
  gradient_from text,             -- لون التدرج من
  gradient_to text,               -- لون التدرج إلى
  
  -- المسار
  route_path text NOT NULL,       -- المسار عند الضغط على البطاقة
  
  -- الترتيب والحالة
  display_order int DEFAULT 0,    -- ترتيب العرض
  is_active boolean DEFAULT true, -- البطاقة نشطة؟
  
  -- الصلاحيات المطلوبة (optional)
  required_role text,             -- دور مطلوب (general_manager, operations_manager...)
  required_department text,       -- قسم مطلوب (b2f_operations, b2b_marketing...)
  
  -- البيانات الإضافية
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===================================
-- جدول: Gateway Access (صلاحيات الوصول)
-- ===================================
CREATE TABLE IF NOT EXISTS gateway_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- المستخدم
  user_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  
  -- البطاقة
  card_id uuid NOT NULL REFERENCES gateway_cards(id) ON DELETE CASCADE,
  
  -- الصلاحية
  access_level text DEFAULT 'view' CHECK (access_level IN (
    'view',      -- عرض فقط
    'operate',   -- تشغيل
    'manage',    -- إدارة
    'full'       -- كامل
  )),
  
  -- من منح الصلاحية
  granted_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  
  -- الصلاحية
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  
  -- الحالة
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  
  -- البيانات الإضافية
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- قيود
  UNIQUE (user_id, card_id)
);

-- ===================================
-- RLS Policies
-- ===================================
ALTER TABLE gateway_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_access ENABLE ROW LEVEL SECURITY;

-- القراءة: جميع الموظفين
CREATE POLICY "Staff can view active cards"
  ON gateway_cards FOR SELECT
  USING (is_active = true);

-- الإدارة: GM فقط
CREATE POLICY "GM can manage cards"
  ON gateway_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
      AND role = 'general_manager'
    )
  );

-- القراءة: المستخدم يرى صلاحياته فقط
CREATE POLICY "Users can view own access"
  ON gateway_access FOR SELECT
  USING (
    user_id = (current_setting('app.current_staff_id', true))::uuid
    OR EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
      AND role = 'general_manager'
    )
  );

-- الإدارة: GM فقط
CREATE POLICY "GM can manage access"
  ON gateway_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
      AND role = 'general_manager'
    )
  );

-- ===================================
-- دالة: الحصول على بطاقات المستخدم
-- ===================================
CREATE OR REPLACE FUNCTION get_user_gateway_cards(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_gm boolean;
  v_cards jsonb;
BEGIN
  -- التحقق: هل المستخدم GM؟
  SELECT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE id = p_user_id
    AND role = 'general_manager'
  ) INTO v_is_gm;
  
  -- إذا كان GM: إرجاع جميع البطاقات
  IF v_is_gm THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', gc.id,
        'card_key', gc.card_key,
        'title_ar', gc.title_ar,
        'title_en', gc.title_en,
        'description_ar', gc.description_ar,
        'description_en', gc.description_en,
        'icon', gc.icon,
        'color', gc.color,
        'gradient_from', gc.gradient_from,
        'gradient_to', gc.gradient_to,
        'route_path', gc.route_path,
        'display_order', gc.display_order,
        'access_level', 'full',
        'is_gm_access', true
      )
      ORDER BY gc.display_order, gc.title_ar
    ), '[]'::jsonb)
    INTO v_cards
    FROM gateway_cards gc
    WHERE gc.is_active = true;
  ELSE
    -- غير GM: إرجاع البطاقات المصرح بها فقط
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', gc.id,
        'card_key', gc.card_key,
        'title_ar', gc.title_ar,
        'title_en', gc.title_en,
        'description_ar', gc.description_ar,
        'description_en', gc.description_en,
        'icon', gc.icon,
        'color', gc.color,
        'gradient_from', gc.gradient_from,
        'gradient_to', gc.gradient_to,
        'route_path', gc.route_path,
        'display_order', gc.display_order,
        'access_level', ga.access_level,
        'is_gm_access', false
      )
      ORDER BY gc.display_order, gc.title_ar
    ), '[]'::jsonb)
    INTO v_cards
    FROM gateway_cards gc
    INNER JOIN gateway_access ga ON ga.card_id = gc.id
    WHERE gc.is_active = true
    AND ga.user_id = p_user_id
    AND ga.status = 'active'
    AND (ga.valid_until IS NULL OR ga.valid_until > now());
  END IF;
  
  RETURN v_cards;
END;
$$;

-- ===================================
-- دالة: منح صلاحية بطاقة
-- ===================================
CREATE OR REPLACE FUNCTION grant_gateway_access(
  p_user_id uuid,
  p_card_key text,
  p_access_level text DEFAULT 'view',
  p_granted_by uuid DEFAULT NULL,
  p_valid_until timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card_id uuid;
  v_access_id uuid;
BEGIN
  -- الحصول على card_id
  SELECT id INTO v_card_id
  FROM gateway_cards
  WHERE card_key = p_card_key
  AND is_active = true;
  
  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'Card with key % not found', p_card_key;
  END IF;
  
  -- منح الصلاحية
  INSERT INTO gateway_access (
    user_id,
    card_id,
    access_level,
    granted_by,
    valid_until,
    notes,
    status
  ) VALUES (
    p_user_id,
    v_card_id,
    p_access_level,
    p_granted_by,
    p_valid_until,
    p_notes,
    'active'
  )
  ON CONFLICT (user_id, card_id)
  DO UPDATE SET
    access_level = EXCLUDED.access_level,
    granted_by = EXCLUDED.granted_by,
    valid_until = EXCLUDED.valid_until,
    notes = EXCLUDED.notes,
    status = 'active',
    updated_at = now()
  RETURNING id INTO v_access_id;
  
  RETURN v_access_id;
END;
$$;

-- ===================================
-- دالة: إلغاء صلاحية بطاقة
-- ===================================
CREATE OR REPLACE FUNCTION revoke_gateway_access(
  p_user_id uuid,
  p_card_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card_id uuid;
BEGIN
  -- الحصول على card_id
  SELECT id INTO v_card_id
  FROM gateway_cards
  WHERE card_key = p_card_key;
  
  IF v_card_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- إلغاء الصلاحية
  UPDATE gateway_access
  SET 
    status = 'suspended',
    updated_at = now()
  WHERE user_id = p_user_id
  AND card_id = v_card_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: التحقق من صلاحية بطاقة
-- ===================================
CREATE OR REPLACE FUNCTION check_gateway_access(
  p_user_id uuid,
  p_card_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_access boolean := false;
  v_is_gm boolean;
BEGIN
  -- التحقق: هل المستخدم GM؟
  SELECT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE id = p_user_id
    AND role = 'general_manager'
  ) INTO v_is_gm;
  
  -- GM له صلاحية على كل شيء
  IF v_is_gm THEN
    RETURN true;
  END IF;
  
  -- التحقق من الصلاحية
  SELECT EXISTS (
    SELECT 1
    FROM gateway_access ga
    INNER JOIN gateway_cards gc ON gc.id = ga.card_id
    WHERE ga.user_id = p_user_id
    AND gc.card_key = p_card_key
    AND gc.is_active = true
    AND ga.status = 'active'
    AND (ga.valid_until IS NULL OR ga.valid_until > now())
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- ===================================
-- Indexes للأداء
-- ===================================
CREATE INDEX IF NOT EXISTS idx_gateway_cards_key ON gateway_cards(card_key);
CREATE INDEX IF NOT EXISTS idx_gateway_cards_active ON gateway_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_gateway_cards_order ON gateway_cards(display_order);
CREATE INDEX IF NOT EXISTS idx_gateway_access_user ON gateway_access(user_id);
CREATE INDEX IF NOT EXISTS idx_gateway_access_card ON gateway_access(card_id);
CREATE INDEX IF NOT EXISTS idx_gateway_access_status ON gateway_access(status);

-- ===================================
-- تفعيل Realtime
-- ===================================
ALTER PUBLICATION supabase_realtime ADD TABLE gateway_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE gateway_access;

-- ===================================
-- بيانات: البطاقات الافتراضية
-- ===================================
INSERT INTO gateway_cards (card_key, title_ar, title_en, description_ar, description_en, icon, color, gradient_from, gradient_to, route_path, display_order) VALUES
('command_room', 'غرفة القيادة', 'Command Room', 'غرفة العمليات التنفيذية والإشراف الشامل', 'Executive Operations Room', 'Crown', 'purple', 'purple-500', 'indigo-600', '/admin/operations-room/hub', 1),
('b2f_operations', 'استثمار المزارع', 'B2F Operations', 'إدارة فرص الاستثمار في المزارع', 'Manage Farm Investment Opportunities', 'Sprout', 'green', 'green-500', 'emerald-600', '/admin/b2f', 2),
('b2b_auctions', 'مزاد الشركات', 'B2B Auctions', 'مزادات بين الشركات والتجارة', 'Business to Business Auctions', 'Gavel', 'blue', 'blue-500', 'cyan-600', '/admin/b2b', 3),
('farm_command', 'تشغيل المزارع', 'Farm Operations', 'إدارة تشغيل المزارع الفعلية', 'Manage Farm Operations', 'Tractor', 'amber', 'amber-500', 'orange-600', '/admin/farms/operations', 4),
('financial_management', 'الإدارة المالية', 'Financial Management', 'إدارة الحسابات والمالية', 'Manage Finances and Accounts', 'DollarSign', 'red', 'red-500', 'pink-600', '/admin/finance', 5),
('marketing_management', 'إدارة التسويق', 'Marketing Management', 'إدارة الحملات والتسويق', 'Manage Marketing Campaigns', 'TrendingUp', 'yellow', 'yellow-500', 'amber-600', '/admin/marketing', 6),
('team_management', 'إدارة الفريق', 'Team Management', 'إدارة الموظفين والصلاحيات', 'Manage Staff and Permissions', 'Users', 'slate', 'slate-500', 'gray-600', '/admin/team', 7),
('settings', 'الإعدادات', 'Settings', 'إعدادات النظام والتخصيص', 'System Settings and Customization', 'Settings', 'gray', 'gray-500', 'slate-600', '/admin/settings', 8)
ON CONFLICT (card_key) DO NOTHING;

-- ===================================
-- اختبار: منح صلاحيات للـ GM
-- ===================================
DO $$
DECLARE
  v_gm_id uuid;
BEGIN
  -- الحصول على GM
  SELECT id INTO v_gm_id
  FROM platform_staff
  WHERE staff_code = 'GM-001'
  LIMIT 1;
  
  IF v_gm_id IS NOT NULL THEN
    RAISE NOTICE 'GM has automatic access to all cards (no need to grant)';
  END IF;
END $$;
