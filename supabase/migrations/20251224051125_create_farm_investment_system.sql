/*
  # نظام استثمار المزارع - القسم الرسمي

  ## النظرة العامة
  نظام استثماري متكامل للقسم الرسمي "استثمار أشجار المزارع"
  مخصص للمستثمرين والمؤسسات لاستثمار مزارع كاملة

  ## الفرق عن نظام استئجار الأشجار
  - استئجار الأشجار: للأفراد، أشجار فردية، مبالغ صغيرة
  - استثمار المزارع: للمستثمرين، مزارع كاملة، استثمارات كبيرة

  ## 1. الجداول الجديدة
    
    ### farm_investment_types
    أنواع الاستثمار المتاحة (شراكة، تمويل، ملكية جزئية)
    - id (uuid, primary key)
    - type_name_ar (اسم النوع بالعربية)
    - type_name_en (اسم النوع بالإنجليزية)
    - icon (أيقونة)
    - description_ar (وصف)
    - is_active (حالة التفعيل)
    - display_order (ترتيب العرض)

    ### farm_projects
    مشاريع المزارع المتاحة للاستثمار
    - id (uuid, primary key)
    - project_name_ar (اسم المشروع)
    - investment_type_id (نوع الاستثمار)
    - location_region_id (المنطقة)
    - location_city_id (المدينة)
    - farm_area (مساحة المزرعة بالهكتار)
    - tree_types (أنواع الأشجار - JSON array)
    - total_trees (عدد الأشجار الكلي)
    - total_investment_amount (إجمالي الاستثمار المطلوب)
    - min_investment_amount (الحد الأدنى للاستثمار)
    - available_shares (الحصص المتاحة)
    - total_shares (إجمالي الحصص)
    - expected_annual_return_min (العائد السنوي المتوقع - الحد الأدنى %)
    - expected_annual_return_max (العائد السنوي المتوقع - الحد الأقصى %)
    - investment_duration_years (مدة الاستثمار بالسنوات)
    - profit_distribution_frequency (دورية توزيع الأرباح)
    - images (صور المزرعة - JSON array)
    - description_ar (وصف تفصيلي)
    - features_ar (المميزات - JSON array)
    - documents (مستندات - JSON array)
    - status (حالة المشروع)
    - start_date (تاريخ البدء)
    - end_date (تاريخ الانتهاء)
    - is_active (حالة التفعيل)
    - created_at (تاريخ الإنشاء)
    - updated_at (تاريخ التحديث)

    ### farm_investments
    استثمارات المستخدمين في المشاريع
    - id (uuid, primary key)
    - project_id (معرّف المشروع)
    - investor_id (معرّف المستثمر)
    - investment_amount (مبلغ الاستثمار)
    - shares_count (عدد الحصص)
    - investment_date (تاريخ الاستثمار)
    - status (حالة الاستثمار)
    - contract_signed (تم توقيع العقد)
    - contract_document (مستند العقد)
    - payment_status (حالة الدفع)
    - notes (ملاحظات)
    - created_at (تاريخ الإنشاء)
    - updated_at (تاريخ التحديث)

    ### farm_investment_returns
    عوائد الاستثمارات (توزيعات الأرباح)
    - id (uuid, primary key)
    - investment_id (معرّف الاستثمار)
    - return_date (تاريخ العائد)
    - return_amount (مبلغ العائد)
    - return_percentage (نسبة العائد %)
    - payment_status (حالة الدفع)
    - payment_date (تاريخ الدفع)
    - notes (ملاحظات)
    - created_at (تاريخ الإنشاء)

  ## 2. الأمان (RLS)
    - المستثمرون يمكنهم رؤية استثماراتهم فقط
    - الجميع يمكنهم رؤية المشاريع المتاحة
    - الإداريون فقط يمكنهم إضافة/تعديل المشاريع
    - العوائد مرئية للمستثمر فقط

  ## 3. Triggers
    - تحديث available_shares تلقائياً عند الاستثمار
    - تحديث updated_at تلقائياً
*/

-- إنشاء نوع enum لحالة المشروع
DO $$ BEGIN
  CREATE TYPE farm_project_status AS ENUM (
    'upcoming',      -- قادم
    'open',          -- مفتوح للاستثمار
    'in_progress',   -- قيد التنفيذ
    'completed',     -- مكتمل
    'closed'         -- مغلق
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- إنشاء نوع enum لحالة الاستثمار
DO $$ BEGIN
  CREATE TYPE farm_investment_status AS ENUM (
    'pending',    -- قيد المراجعة
    'approved',   -- موافق عليه
    'active',     -- نشط
    'completed',  -- مكتمل
    'cancelled'   -- ملغى
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- إنشاء نوع enum لحالة الدفع
DO $$ BEGIN
  CREATE TYPE farm_payment_status AS ENUM (
    'pending',   -- قيد الانتظار
    'paid',      -- مدفوع
    'failed',    -- فشل
    'refunded'   -- مسترد
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. جدول أنواع الاستثمار
CREATE TABLE IF NOT EXISTS farm_investment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name_ar text NOT NULL,
  type_name_en text NOT NULL,
  icon text DEFAULT '🤝',
  description_ar text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. جدول مشاريع المزارع
CREATE TABLE IF NOT EXISTS farm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name_ar text NOT NULL,
  investment_type_id uuid REFERENCES farm_investment_types(id) ON DELETE SET NULL,
  location_region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  location_city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  farm_area decimal NOT NULL DEFAULT 0,
  tree_types jsonb DEFAULT '[]'::jsonb,
  total_trees integer DEFAULT 0,
  total_investment_amount decimal NOT NULL DEFAULT 0,
  min_investment_amount decimal NOT NULL DEFAULT 10000,
  available_shares integer NOT NULL DEFAULT 100,
  total_shares integer NOT NULL DEFAULT 100,
  expected_annual_return_min decimal DEFAULT 12,
  expected_annual_return_max decimal DEFAULT 25,
  investment_duration_years integer DEFAULT 5,
  profit_distribution_frequency text DEFAULT 'سنوياً',
  images jsonb DEFAULT '[]'::jsonb,
  description_ar text,
  features_ar jsonb DEFAULT '[]'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  status farm_project_status DEFAULT 'upcoming',
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. جدول الاستثمارات
CREATE TABLE IF NOT EXISTS farm_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES farm_projects(id) ON DELETE CASCADE NOT NULL,
  investor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  investment_amount decimal NOT NULL,
  shares_count integer NOT NULL DEFAULT 1,
  investment_date date DEFAULT CURRENT_DATE,
  status farm_investment_status DEFAULT 'pending',
  contract_signed boolean DEFAULT false,
  contract_document text,
  payment_status farm_payment_status DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. جدول عوائد الاستثمارات
CREATE TABLE IF NOT EXISTS farm_investment_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid REFERENCES farm_investments(id) ON DELETE CASCADE NOT NULL,
  return_date date NOT NULL,
  return_amount decimal NOT NULL,
  return_percentage decimal NOT NULL,
  payment_status farm_payment_status DEFAULT 'pending',
  payment_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- إنشاء Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_farm_projects_status ON farm_projects(status);
CREATE INDEX IF NOT EXISTS idx_farm_projects_type ON farm_projects(investment_type_id);
CREATE INDEX IF NOT EXISTS idx_farm_projects_region ON farm_projects(location_region_id);
CREATE INDEX IF NOT EXISTS idx_farm_investments_project ON farm_investments(project_id);
CREATE INDEX IF NOT EXISTS idx_farm_investments_investor ON farm_investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_farm_returns_investment ON farm_investment_returns(investment_id);

-- تفعيل RLS على كل الجداول
ALTER TABLE farm_investment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_investment_returns ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لـ farm_investment_types
CREATE POLICY "الجميع يمكنهم رؤية أنواع الاستثمار"
  ON farm_investment_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "الإداريون فقط يمكنهم إدارة أنواع الاستثمار"
  ON farm_investment_types FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  ));

-- سياسات RLS لـ farm_projects
CREATE POLICY "الجميع يمكنهم رؤية المشاريع النشطة"
  ON farm_projects FOR SELECT
  USING (is_active = true);

CREATE POLICY "الإداريون فقط يمكنهم إضافة المشاريع"
  ON farm_projects FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  ));

CREATE POLICY "الإداريون فقط يمكنهم تعديل المشاريع"
  ON farm_projects FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  ));

CREATE POLICY "الإداريون فقط يمكنهم حذف المشاريع"
  ON farm_projects FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  ));

-- سياسات RLS لـ farm_investments
CREATE POLICY "المستخدمون يمكنهم رؤية استثماراتهم"
  ON farm_investments FOR SELECT
  TO authenticated
  USING (investor_id = auth.uid());

CREATE POLICY "الإداريون يمكنهم رؤية كل الاستثمارات"
  ON farm_investments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  ));

CREATE POLICY "المستخدمون يمكنهم إنشاء استثمار"
  ON farm_investments FOR INSERT
  TO authenticated
  WITH CHECK (investor_id = auth.uid());

CREATE POLICY "الإداريون يمكنهم تعديل الاستثمارات"
  ON farm_investments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  ));

-- سياسات RLS لـ farm_investment_returns
CREATE POLICY "المستثمرون يمكنهم رؤية عوائدهم"
  ON farm_investment_returns FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM farm_investments 
    WHERE farm_investments.id = farm_investment_returns.investment_id 
    AND farm_investments.investor_id = auth.uid()
  ));

CREATE POLICY "الإداريون يمكنهم إدارة العوائد"
  ON farm_investment_returns FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  ));

-- Trigger لتحديث available_shares عند الاستثمار
CREATE OR REPLACE FUNCTION update_farm_project_shares()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'active' THEN
    UPDATE farm_projects 
    SET available_shares = available_shares - NEW.shares_count
    WHERE id = NEW.project_id;
  END IF;
  
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled')) THEN
    UPDATE farm_projects 
    SET available_shares = available_shares + OLD.shares_count
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_farm_project_shares
  AFTER INSERT OR UPDATE OR DELETE ON farm_investments
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_project_shares();

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_farm_investment_types_updated_at
  BEFORE UPDATE ON farm_investment_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_projects_updated_at
  BEFORE UPDATE ON farm_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_investments_updated_at
  BEFORE UPDATE ON farm_investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إدراج بيانات تجريبية: أنواع الاستثمار
INSERT INTO farm_investment_types (type_name_ar, type_name_en, icon, description_ar, display_order) VALUES
('شراكة زراعية', 'Farm Partnership', '🤝', 'استثمار بنظام الشراكة مع المزارع لتقاسم الأرباح', 1),
('تمويل مشروع', 'Project Financing', '💰', 'تمويل مشروع زراعي كامل مقابل عائد سنوي مضمون', 2),
('ملكية جزئية', 'Partial Ownership', '🏛️', 'امتلاك حصة من مزرعة والحصول على نصيب من الإنتاج', 3),
('استثمار موسمي', 'Seasonal Investment', '🌾', 'استثمار قصير المدى للمواسم الزراعية', 4)
ON CONFLICT DO NOTHING;

-- إدراج بيانات تجريبية: مشاريع مزارع
INSERT INTO farm_projects (
  project_name_ar,
  investment_type_id,
  location_region_id,
  farm_area,
  tree_types,
  total_trees,
  total_investment_amount,
  min_investment_amount,
  available_shares,
  total_shares,
  expected_annual_return_min,
  expected_annual_return_max,
  investment_duration_years,
  profit_distribution_frequency,
  images,
  description_ar,
  features_ar,
  status,
  start_date
)
SELECT
  'مزرعة نخيل الأحساء المتطورة',
  (SELECT id FROM farm_investment_types WHERE type_name_en = 'Farm Partnership' LIMIT 1),
  (SELECT id FROM regions WHERE name_ar = 'المنطقة الشرقية' LIMIT 1),
  25.5,
  '["نخيل سكري", "نخيل خلاص", "نخيل برحي"]'::jsonb,
  2000,
  5000000,
  50000,
  80,
  100,
  18,
  25,
  7,
  'ربع سنوي',
  '["https://images.pexels.com/photos/1002703/pexels-photo-1002703.jpeg"]'::jsonb,
  'مزرعة نخيل حديثة بمساحة 25.5 هكتار في الأحساء، مجهزة بأحدث أنظمة الري والرعاية. تضم 2000 نخلة من أجود الأصناف',
  '["أنظمة ري ذكية", "مراقبة دائمة", "إدارة احترافية", "عوائد مضمونة", "تقارير ربع سنوية", "تأمين شامل"]'::jsonb,
  'open',
  CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM farm_projects WHERE project_name_ar = 'مزرعة نخيل الأحساء المتطورة');

INSERT INTO farm_projects (
  project_name_ar,
  investment_type_id,
  location_region_id,
  farm_area,
  tree_types,
  total_trees,
  total_investment_amount,
  min_investment_amount,
  available_shares,
  total_shares,
  expected_annual_return_min,
  expected_annual_return_max,
  investment_duration_years,
  profit_distribution_frequency,
  images,
  description_ar,
  features_ar,
  status,
  start_date
)
SELECT
  'مشروع زيتون الجوف الاستثماري',
  (SELECT id FROM farm_investment_types WHERE type_name_en = 'Project Financing' LIMIT 1),
  (SELECT id FROM regions WHERE name_ar = 'منطقة الجوف' LIMIT 1),
  40.0,
  '["زيتون أربكين", "زيتون بيكوال"]'::jsonb,
  5000,
  8000000,
  100000,
  50,
  80,
  15,
  22,
  10,
  'سنوياً',
  '["https://images.pexels.com/photos/4505171/pexels-photo-4505171.jpeg"]'::jsonb,
  'مشروع استثماري ضخم لزراعة الزيتون في الجوف بمساحة 40 هكتار. تشمل معصرة زيتون حديثة ومصنع تعبئة',
  '["معصرة زيتون خاصة", "مصنع تعبئة", "تصدير دولي", "علامة تجارية خاصة", "عقود توريد مضمونة", "إدارة متكاملة"]'::jsonb,
  'open',
  CURRENT_DATE + INTERVAL '30 days'
WHERE NOT EXISTS (SELECT 1 FROM farm_projects WHERE project_name_ar = 'مشروع زيتون الجوف الاستثماري');

INSERT INTO farm_projects (
  project_name_ar,
  investment_type_id,
  location_region_id,
  farm_area,
  tree_types,
  total_trees,
  total_investment_amount,
  min_investment_amount,
  available_shares,
  total_shares,
  expected_annual_return_min,
  expected_annual_return_max,
  investment_duration_years,
  profit_distribution_frequency,
  images,
  description_ar,
  features_ar,
  status,
  start_date
)
SELECT
  'مزرعة مانجا جازان العضوية',
  (SELECT id FROM farm_investment_types WHERE type_name_en = 'Partial Ownership' LIMIT 1),
  (SELECT id FROM regions WHERE name_ar = 'منطقة جازان' LIMIT 1),
  15.0,
  '["مانجا كينت", "مانجا تومي"]'::jsonb,
  800,
  3000000,
  75000,
  20,
  50,
  20,
  30,
  5,
  'نصف سنوي',
  '["https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg"]'::jsonb,
  'مزرعة مانجا عضوية معتمدة في جازان. إنتاج عالي الجودة للسوق المحلي والتصدير',
  '["زراعة عضوية معتمدة", "طلب مرتفع", "تصدير للخارج", "أرباح موسمية عالية", "مناخ مثالي", "تسويق احترافي"]'::jsonb,
  'in_progress',
  CURRENT_DATE - INTERVAL '60 days'
WHERE NOT EXISTS (SELECT 1 FROM farm_projects WHERE project_name_ar = 'مزرعة مانجا جازان العضوية');

INSERT INTO farm_projects (
  project_name_ar,
  investment_type_id,
  location_region_id,
  farm_area,
  tree_types,
  total_trees,
  total_investment_amount,
  min_investment_amount,
  available_shares,
  total_shares,
  expected_annual_return_min,
  expected_annual_return_max,
  investment_duration_years,
  profit_distribution_frequency,
  images,
  description_ar,
  features_ar,
  status,
  start_date
)
SELECT
  'مشروع بن خولاني المتخصص',
  (SELECT id FROM farm_investment_types WHERE type_name_en = 'Seasonal Investment' LIMIT 1),
  (SELECT id FROM regions WHERE name_ar = 'منطقة جازان' LIMIT 1),
  12.0,
  '["بن خولاني"]'::jsonb,
  3000,
  4500000,
  80000,
  30,
  60,
  25,
  35,
  3,
  'موسمياً',
  '["https://images.pexels.com/photos/4022090/pexels-photo-4022090.jpeg"]'::jsonb,
  'مشروع متخصص لزراعة البن الخولاني عالي الجودة. سوق نامي وطلب كبير على المنتج',
  '["بن خولاني أصيل", "جودة عالمية", "أسعار مميزة", "عوائد سريعة", "سوق واعد", "خبراء متخصصون"]'::jsonb,
  'upcoming',
  CURRENT_DATE + INTERVAL '45 days'
WHERE NOT EXISTS (SELECT 1 FROM farm_projects WHERE project_name_ar = 'مشروع بن خولاني المتخصص');
