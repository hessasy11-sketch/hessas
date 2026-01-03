/*
  # نظام التصنيفات الاستثمارية للمستثمرين
  
  1. الهدف
    - تصنيف المستثمرين حسب عدد الأشجار التي يمتلكونها
    - إضافة بطاقة هوية استثمارية لكل مستثمر
    - تتبع المرحلة التشغيلية الحالية
  
  2. التصنيفات
    - غرسة: 1-9 أشجار
    - حديقة: 10-49 شجرة
    - بستان: 50-199 شجرة
    - مزرعة صغيرة: 200-499 شجرة
    - مزرعة تشغيلية: 500-999 شجرة
    - مزرعة استثمارية: 1000+ شجرة
  
  3. المراحل التشغيلية
    - حجز: تم إنشاء الطلب
    - دفع: تم رفع الإيصال أو معتمد
    - عقد: تم إصدار العقد
    - تشغيل: تم النقل للتشغيل
    - حصاد: موسم الحصاد
    - خدمة: خدمات ما بعد الحصاد
*/

-- 1. إضافة حقول جديدة لجدول حسابات المستثمرين
ALTER TABLE b2f_investor_accounts
ADD COLUMN IF NOT EXISTS total_trees integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS investor_classification text,
ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'حجز',
ADD COLUMN IF NOT EXISTS last_activity_date timestamptz DEFAULT now();

-- 2. دالة لحساب إجمالي الأشجار للمستثمر
CREATE OR REPLACE FUNCTION calculate_investor_total_trees(account_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
BEGIN
  -- حساب مجموع الأشجار من جميع طلبات المبيعات المعتمدة والمنقولة للتشغيل
  SELECT COALESCE(SUM(number_of_trees), 0)
  INTO v_total
  FROM b2f_sales_requests
  WHERE investor_account_id = account_uuid
    AND status IN ('contract_issued', 'receipt_approved');
  
  -- تحديث الإجمالي في جدول الحساب
  UPDATE b2f_investor_accounts
  SET total_trees = v_total,
      last_activity_date = now()
  WHERE id = account_uuid;
  
  RETURN v_total;
END;
$$;

-- 3. دالة لتحديد التصنيف بناءً على عدد الأشجار
CREATE OR REPLACE FUNCTION get_investor_classification(trees_count integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF trees_count = 0 THEN
    RETURN 'مستثمر جديد';
  ELSIF trees_count BETWEEN 1 AND 9 THEN
    RETURN 'غرسة';
  ELSIF trees_count BETWEEN 10 AND 49 THEN
    RETURN 'حديقة';
  ELSIF trees_count BETWEEN 50 AND 199 THEN
    RETURN 'بستان';
  ELSIF trees_count BETWEEN 200 AND 499 THEN
    RETURN 'مزرعة صغيرة';
  ELSIF trees_count BETWEEN 500 AND 999 THEN
    RETURN 'مزرعة تشغيلية';
  ELSE
    RETURN 'مزرعة استثمارية';
  END IF;
END;
$$;

-- 4. دالة لتحديث تصنيف المستثمر
CREATE OR REPLACE FUNCTION update_investor_classification(account_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_trees integer;
  v_classification text;
BEGIN
  -- حساب إجمالي الأشجار
  v_total_trees := calculate_investor_total_trees(account_uuid);
  
  -- تحديد التصنيف
  v_classification := get_investor_classification(v_total_trees);
  
  -- تحديث التصنيف
  UPDATE b2f_investor_accounts
  SET 
    total_trees = v_total_trees,
    investor_classification = v_classification,
    last_activity_date = now()
  WHERE id = account_uuid;
END;
$$;

-- 5. دالة لتحديد المرحلة التشغيلية الحالية للمستثمر
CREATE OR REPLACE FUNCTION get_investor_current_stage(account_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_operations boolean;
  v_has_contracts boolean;
  v_has_approved boolean;
  v_has_pending boolean;
BEGIN
  -- التحقق من وجود تشغيل فعلي
  SELECT EXISTS (
    SELECT 1 FROM b2f_operations
    WHERE investor_account_id = account_uuid
  ) INTO v_has_operations;
  
  IF v_has_operations THEN
    -- التحقق من موسم الحصاد
    SELECT EXISTS (
      SELECT 1 FROM b2f_operations o
      INNER JOIN b2f_farm_seasons s ON o.season_id = s.id
      WHERE o.investor_account_id = account_uuid
        AND s.current_phase = 'harvest'
    ) INTO v_has_operations;
    
    IF v_has_operations THEN
      RETURN 'حصاد';
    ELSE
      RETURN 'تشغيل';
    END IF;
  END IF;
  
  -- التحقق من وجود عقود
  SELECT EXISTS (
    SELECT 1 FROM b2f_sales_requests
    WHERE investor_account_id = account_uuid
      AND status = 'contract_issued'
  ) INTO v_has_contracts;
  
  IF v_has_contracts THEN
    RETURN 'عقد';
  END IF;
  
  -- التحقق من إيصالات معتمدة
  SELECT EXISTS (
    SELECT 1 FROM b2f_sales_requests
    WHERE investor_account_id = account_uuid
      AND status = 'receipt_approved'
  ) INTO v_has_approved;
  
  IF v_has_approved THEN
    RETURN 'دفع';
  END IF;
  
  -- التحقق من طلبات في الانتظار
  SELECT EXISTS (
    SELECT 1 FROM b2f_sales_requests
    WHERE investor_account_id = account_uuid
  ) INTO v_has_pending;
  
  IF v_has_pending THEN
    RETURN 'حجز';
  END IF;
  
  RETURN 'جديد';
END;
$$;

-- 6. Trigger لتحديث التصنيف عند إنشاء أو تحديث طلب مبيعات
CREATE OR REPLACE FUNCTION trigger_update_investor_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث التصنيف إذا كان هناك حساب مستثمر
  IF NEW.investor_account_id IS NOT NULL THEN
    PERFORM update_investor_classification(NEW.investor_account_id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_request_classification_update
  AFTER INSERT OR UPDATE ON b2f_sales_requests
  FOR EACH ROW
  WHEN (NEW.investor_account_id IS NOT NULL)
  EXECUTE FUNCTION trigger_update_investor_classification();

-- 7. تحديث جميع الحسابات الحالية
DO $$
DECLARE
  account_record RECORD;
BEGIN
  FOR account_record IN 
    SELECT id FROM b2f_investor_accounts
  LOOP
    PERFORM update_investor_classification(account_record.id);
  END LOOP;
END $$;