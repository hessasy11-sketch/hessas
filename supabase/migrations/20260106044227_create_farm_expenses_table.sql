/*
  # إنشاء جدول المصروفات الزراعية (farm_expenses)
  
  لدعم قرارات اعتماد المصروفات
*/

CREATE TABLE IF NOT EXISTS farm_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  
  -- تفاصيل المصروف
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL, -- fuel, seeds, fertilizers, labor, equipment, etc.
  
  -- طلب الاعتماد
  requested_by uuid REFERENCES platform_staff(id),
  requested_at timestamptz DEFAULT now(),
  
  -- الاعتماد
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES platform_staff(id),
  approved_at timestamptz,
  rejection_reason text,
  
  -- التاريخ
  expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_farm_expenses_farm_id ON farm_expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_expenses_approval_status ON farm_expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_farm_expenses_requested_by ON farm_expenses(requested_by);

-- RLS
ALTER TABLE farm_expenses ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة
CREATE POLICY "Anyone can read farm_expenses"
  ON farm_expenses FOR SELECT
  USING (true);

-- سياسة الإدراج
CREATE POLICY "Staff can request expenses"
  ON farm_expenses FOR INSERT
  WITH CHECK (true);

-- سياسة التحديث
CREATE POLICY "Staff can update their expenses"
  ON farm_expenses FOR UPDATE
  USING (true);

-- إضافة بيانات اختبار
INSERT INTO farm_expenses (farm_id, description, amount, category, requested_by, approval_status)
SELECT 
  bf.id,
  'شراء أسمدة عضوية',
  5000,
  'fertilizers',
  ps.id,
  'pending'
FROM b2f_farms bf
CROSS JOIN platform_staff ps
WHERE bf.name LIKE '%الزيتون%'
AND ps.role = 'general_manager'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO farm_expenses (farm_id, description, amount, category, requested_by, approval_status)
SELECT 
  bf.id,
  'صيانة نظام الري',
  3500,
  'equipment',
  ps.id,
  'pending'
FROM b2f_farms bf
CROSS JOIN platform_staff ps
WHERE bf.name LIKE '%الزيتون%'
AND ps.role = 'general_manager'
LIMIT 1
ON CONFLICT DO NOTHING;
