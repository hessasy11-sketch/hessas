/*
  # إضافة trigger تلقائي لنقل العقود للتشغيل
  
  1. إنشاء دالة:
    - تنشئ سجل تشغيلي تلقائياً عند إصدار عقد
    - تربط العقد بقسم التشغيل
  
  2. التفعيل:
    - Trigger يعمل عند إدخال عقد جديد
    - يملأ جميع البيانات المطلوبة تلقائياً
*/

-- دالة إنشاء سجل تشغيلي تلقائي
CREATE OR REPLACE FUNCTION create_tree_operation_on_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء سجل تشغيلي فقط إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM b2f_tree_operations 
    WHERE sales_request_id = (
      SELECT id FROM b2f_sales_requests WHERE id = NEW.sales_request_id
    )
  ) THEN
    INSERT INTO b2f_tree_operations (
      sales_request_id,
      contract_number,
      farm_id,
      opportunity_id,
      investor_name,
      investor_phone,
      investor_account_id,
      tree_type,
      tree_count,
      farm_section,
      internal_code,
      current_phase,
      progress_percentage,
      activation_date,
      contract_start_date,
      contract_end_date,
      contract_duration_years,
      total_amount,
      last_update_description,
      last_update_date,
      is_active,
      is_paused
    )
    SELECT 
      sr.id,
      NEW.contract_number,
      sr.farm_id,
      sr.opportunity_id,
      sr.investor_name,
      sr.investor_phone,
      sr.investor_account_id,
      sr.tree_type,
      sr.number_of_trees,
      'القسم الرئيسي',
      'OP-' || LPAD(sr.number_of_trees::text, 4, '0') || '-' || LEFT(sr.id::text, 8),
      'activation',
      10,
      NEW.created_at,
      NEW.start_date::date,
      NEW.end_date::date,
      EXTRACT(YEAR FROM AGE(NEW.end_date, NEW.start_date))::integer,
      sr.total_amount,
      'تم تفعيل العقد ونقله تلقائياً لقسم التشغيل. جاري البدء في العمليات التشغيلية.',
      NEW.created_at,
      true,
      false
    FROM b2f_sales_requests sr
    WHERE sr.id = NEW.sales_request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger للتفعيل التلقائي
DROP TRIGGER IF EXISTS trigger_create_tree_operation ON b2f_contracts;
CREATE TRIGGER trigger_create_tree_operation
  AFTER INSERT ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION create_tree_operation_on_contract();
