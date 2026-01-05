/*
  # ربط اكتمال الاستثمار بولادة المزرعة
  
  ## الوظيفة
  عند إصدار العقد (contract_issued)، يتم تلقائياً:
  1. إنشاء مزرعة تشغيلية جديدة
  2. ربطها بالعقد والطلب
  3. تسجيل ولادة المزرعة
  
  ## الشرط
  يتم فقط إذا كان contract_issued = true ولم تولد المزرعة بعد
*/

-- دالة التحقق وولادة المزرعة
CREATE OR REPLACE FUNCTION auto_birth_farm_on_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_farm_name text;
BEGIN
  -- التحقق: هل العقد صادر ولم تولد المزرعة
  IF NEW.contract_issued = true AND OLD.contract_issued IS DISTINCT FROM NEW.contract_issued THEN
    
    -- التحقق: هل المزرعة ولدت بالفعل؟
    IF EXISTS (
      SELECT 1 FROM fc_birth_records
      WHERE source_contract_id = NEW.id OR source_sales_request_id = NEW.id
    ) THEN
      -- المزرعة موجودة بالفعل، لا نفعل شيء
      RETURN NEW;
    END IF;
    
    -- إنشاء اسم المزرعة
    SELECT 'مزرعة العقد ' || NEW.contract_number INTO v_farm_name;
    
    -- ولادة المزرعة
    SELECT birth_operational_farm(
      NEW.id, -- contract_id
      NEW.id, -- sales_request_id (نفس السجل حالياً)
      (SELECT id FROM b2f_farms LIMIT 1), -- أول مزرعة مرجعية (يمكن تحسينه)
      v_farm_name
    ) INTO v_farm_id;
    
    -- تحديث العقد بمعرف المزرعة (إذا كان العمود موجود)
    -- UPDATE b2f_contracts SET operational_farm_id = v_farm_id WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS auto_birth_farm_on_contract_trigger ON b2f_contracts;
CREATE TRIGGER auto_birth_farm_on_contract_trigger
  AFTER UPDATE ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_birth_farm_on_contract();

COMMENT ON FUNCTION auto_birth_farm_on_contract() IS 'تلقائياً تنشئ مزرعة تشغيلية عند إصدار العقد';