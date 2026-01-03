/*
  # تحديث تلقائي لتصنيف المستثمر

  ## الهدف:
  - تحديث total_trees و investor_classification تلقائياً عند تغيير حالة الطلب
  - تحديث current_stage بناءً على أحدث حالة

  ## Triggers:
  - عند إضافة أو تعديل أو حذف طلب في b2f_sales_requests
*/

-- دالة التحديث التلقائي
CREATE OR REPLACE FUNCTION auto_update_investor_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id uuid;
  v_stage text;
BEGIN
  -- جلب معرف الحساب من رقم الهاتف
  SELECT id INTO v_account_id
  FROM b2f_investor_accounts
  WHERE contact_phone = COALESCE(NEW.investor_phone, OLD.investor_phone)
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    -- تحديث التصنيف وإجمالي الأشجار
    PERFORM update_investor_classification(v_account_id);
    
    -- تحديث المرحلة الحالية
    SELECT get_investor_current_stage(v_account_id) INTO v_stage;
    
    UPDATE b2f_investor_accounts
    SET current_stage = v_stage,
        last_activity_date = now()
    WHERE id = v_account_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- حذف Trigger القديم إن وجد
DROP TRIGGER IF EXISTS trigger_auto_update_investor_stats ON b2f_sales_requests;

-- إنشاء Trigger جديد
CREATE TRIGGER trigger_auto_update_investor_stats
AFTER INSERT OR UPDATE OR DELETE ON b2f_sales_requests
FOR EACH ROW
EXECUTE FUNCTION auto_update_investor_stats();

-- تحديث جميع الحسابات الحالية
DO $$
DECLARE
  account_record RECORD;
BEGIN
  FOR account_record IN 
    SELECT id FROM b2f_investor_accounts
  LOOP
    PERFORM update_investor_classification(account_record.id);
    
    UPDATE b2f_investor_accounts
    SET current_stage = get_investor_current_stage(account_record.id),
        last_activity_date = now()
    WHERE id = account_record.id;
  END LOOP;
END $$;

COMMENT ON FUNCTION auto_update_investor_stats IS 
'يحدث تلقائياً إحصائيات المستثمر عند تغيير حالة الطلبات';
