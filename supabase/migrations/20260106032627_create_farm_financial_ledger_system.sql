/*
  # دفتر التشغيل المالي للمزرعة - المرحلة 1
  
  ## الهدف
  نظام تسجيل المصروفات والمداخيل لكل مزرعة
  
  ## الجداول
  1. farm_financial_ledger - السجل المالي
  2. farm_ledger_categories - التصنيفات المالية
  
  ## الصلاحيات
  - مدير المزرعة: إضافة وتعديل وحذف
  - الفريق: قراءة فقط (حالياً)
  
  ## الحقول
  - نوع العملية: expense/income
  - التصنيف: من جدول categories
  - المبلغ
  - التاريخ
  - ملاحظة
  - مرفق إثبات (اختياري)
*/

-- =====================================================
-- 1. جدول: التصنيفات المالية
-- =====================================================
CREATE TABLE IF NOT EXISTS farm_ledger_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name_ar text NOT NULL,
  name_en text,
  
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  
  icon text,
  color text,
  
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. جدول: السجل المالي
-- =====================================================
CREATE TABLE IF NOT EXISTS farm_financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  
  entry_type text NOT NULL CHECK (entry_type IN ('expense', 'income')),
  
  category_id uuid REFERENCES farm_ledger_categories(id) ON DELETE SET NULL,
  category_name text NOT NULL,
  
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  
  description text,
  notes text,
  
  proof_file_url text,
  proof_file_name text,
  
  created_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  created_by_name text NOT NULL,
  
  approved_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approval_notes text,
  
  is_approved boolean DEFAULT true,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. Indexes للأداء
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_farm_id 
  ON farm_financial_ledger(farm_id);

CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_entry_date 
  ON farm_financial_ledger(entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_entry_type 
  ON farm_financial_ledger(entry_type);

CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_category 
  ON farm_financial_ledger(category_id);

CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_created_by 
  ON farm_financial_ledger(created_by);

-- =====================================================
-- 4. Trigger: updated_at
-- =====================================================
CREATE TRIGGER update_farm_ledger_categories_updated_at
  BEFORE UPDATE ON farm_ledger_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_financial_ledger_updated_at
  BEFORE UPDATE ON farm_financial_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. RLS Policies
-- =====================================================
ALTER TABLE farm_ledger_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_financial_ledger ENABLE ROW LEVEL SECURITY;

-- Categories: الجميع يقرأ
CREATE POLICY "Anyone can view categories"
  ON farm_ledger_categories FOR SELECT
  USING (true);

-- Categories: Admin يضيف/يعدل
CREATE POLICY "Platform staff can manage categories"
  ON farm_ledger_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = auth.uid()
    )
  );

-- Ledger: الجميع يقرأ سجلات المزرعة
CREATE POLICY "Anyone can view farm ledger"
  ON farm_financial_ledger FOR SELECT
  USING (true);

-- Ledger: Platform staff يضيف
CREATE POLICY "Platform staff can add ledger entries"
  ON farm_financial_ledger FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = created_by
    )
  );

-- Ledger: المُنشئ يعدل سجلاته
CREATE POLICY "Creator can update own entries"
  ON farm_financial_ledger FOR UPDATE
  USING (created_by = auth.uid());

-- Ledger: Platform staff يحذف
CREATE POLICY "Platform staff can delete ledger entries"
  ON farm_financial_ledger FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = auth.uid()
    )
  );

-- =====================================================
-- 6. إدراج التصنيفات الافتراضية
-- =====================================================
INSERT INTO farm_ledger_categories (name_ar, name_en, type, icon, color, display_order, is_active)
VALUES
  -- مصروفات
  ('وقود', 'Fuel', 'expense', 'Fuel', 'red', 1, true),
  ('صيانة', 'Maintenance', 'expense', 'Wrench', 'orange', 2, true),
  ('عمالة', 'Labor', 'expense', 'Users', 'blue', 3, true),
  ('مبيدات', 'Pesticides', 'expense', 'Droplet', 'green', 4, true),
  ('أسمدة', 'Fertilizers', 'expense', 'Leaf', 'emerald', 5, true),
  ('ري', 'Irrigation', 'expense', 'Droplets', 'cyan', 6, true),
  ('حصاد', 'Harvest', 'expense', 'Wheat', 'amber', 7, true),
  ('نقل', 'Transportation', 'expense', 'Truck', 'indigo', 8, true),
  ('معدات', 'Equipment', 'expense', 'HardHat', 'gray', 9, true),
  ('كهرباء', 'Electricity', 'expense', 'Zap', 'yellow', 10, true),
  ('مصروفات أخرى', 'Other Expenses', 'expense', 'DollarSign', 'slate', 11, true),
  
  -- مداخيل
  ('بيع محصول', 'Crop Sales', 'income', 'TrendingUp', 'green', 20, true),
  ('إيجار معدات', 'Equipment Rental', 'income', 'Package', 'blue', 21, true),
  ('تعويضات', 'Compensations', 'income', 'Gift', 'purple', 22, true),
  ('مداخيل أخرى', 'Other Income', 'income', 'DollarSign', 'emerald', 23, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. Comments
-- =====================================================
COMMENT ON TABLE farm_ledger_categories IS 'التصنيفات المالية للمصروفات والمداخيل';
COMMENT ON TABLE farm_financial_ledger IS 'دفتر التشغيل المالي للمزرعة';

COMMENT ON COLUMN farm_financial_ledger.entry_type IS 'نوع العملية: expense (مصروف) أو income (مدخول)';
COMMENT ON COLUMN farm_financial_ledger.amount IS 'المبلغ بالريال السعودي';
COMMENT ON COLUMN farm_financial_ledger.entry_date IS 'تاريخ العملية';
COMMENT ON COLUMN farm_financial_ledger.is_approved IS 'هل تمت الموافقة (افتراضياً true)';
