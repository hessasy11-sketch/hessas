/*
  # إنشاء جدول عمليات التشغيل B2F
  
  1. الهدف
    - إنشاء جدول b2f_operations لتتبع عمليات التشغيل للمستثمرين
    - يربط المستثمرين بالمواسم التشغيلية
    - يستخدم في دالة get_investor_current_stage
  
  2. الحقول
    - id: معرف فريد
    - investor_account_id: ربط بحساب المستثمر
    - season_id: ربط بموسم التشغيل
    - number_of_trees: عدد الأشجار في التشغيل
    - status: حالة التشغيل
    - created_at: تاريخ الإنشاء
    - updated_at: تاريخ التحديث
  
  3. الأمان
    - RLS مفعّل
    - سياسات للقراءة والإدارة
*/

-- 1. إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  season_id uuid REFERENCES b2f_farm_seasons(id) ON DELETE SET NULL,
  number_of_trees integer NOT NULL DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. تفعيل RLS
ALTER TABLE b2f_operations ENABLE ROW LEVEL SECURITY;

-- 3. سياسات RLS

-- السماح للجميع بالقراءة (للتحقق من وجود عمليات)
CREATE POLICY "Allow read access to b2f_operations"
  ON b2f_operations
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- السماح للإدارة بجميع العمليات
CREATE POLICY "Allow admin full access to b2f_operations"
  ON b2f_operations
  FOR ALL
  TO authenticated, anon
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- 4. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_b2f_operations_investor_account 
  ON b2f_operations(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_b2f_operations_season 
  ON b2f_operations(season_id);
CREATE INDEX IF NOT EXISTS idx_b2f_operations_status 
  ON b2f_operations(status);

-- 5. Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_b2f_operations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER b2f_operations_updated_at
  BEFORE UPDATE ON b2f_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_operations_updated_at();
