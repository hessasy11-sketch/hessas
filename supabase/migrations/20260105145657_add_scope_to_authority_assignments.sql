/*
  # إضافة نطاق (Scope) إلى authority_assignments

  1. التحديثات
    - إضافة أعمدة scope_type و scope_farm_id
    - تحديث البيانات الموجودة

  2. الأمان
    - الحفاظ على البيانات الموجودة
*/

-- إضافة أعمدة النطاق
ALTER TABLE authority_assignments
ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'platform',
ADD COLUMN IF NOT EXISTS scope_farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- إضافة constraint
ALTER TABLE authority_assignments
ADD CONSTRAINT authority_assignments_scope_check 
CHECK (scope_type IN ('platform', 'b2f', 'b2b', 'farm'));

ALTER TABLE authority_assignments
ADD CONSTRAINT authority_assignments_status_check 
CHECK (status IN ('active', 'suspended', 'revoked'));

-- تحديث البيانات الموجودة: الأدوار القديمة تبقى على مستوى المنصة
UPDATE authority_assignments
SET scope_type = 'platform'
WHERE scope_type IS NULL;

-- فهارس
CREATE INDEX IF NOT EXISTS idx_authority_assignments_scope_farm
  ON authority_assignments(scope_farm_id) WHERE scope_farm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_authority_assignments_scope_status
  ON authority_assignments(scope_type, status);

-- تعليقات
COMMENT ON COLUMN authority_assignments.scope_type IS 'نطاق الصلاحية: platform (كامل), b2f, b2b, أو farm (مزرعة معينة)';
COMMENT ON COLUMN authority_assignments.scope_farm_id IS 'معرف المزرعة (عند scope_type = farm)';
COMMENT ON COLUMN authority_assignments.status IS 'حالة الصلاحية: active, suspended, revoked';
