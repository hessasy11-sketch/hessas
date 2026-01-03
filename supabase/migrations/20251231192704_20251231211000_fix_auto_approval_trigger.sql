/*
  # إصلاح trigger الاعتماد الآلي

  تصحيح اسم الحقل: number_of_trees بدلاً من tree_quantity
*/

CREATE OR REPLACE FUNCTION auto_issue_contract_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  contract_num text;
BEGIN
  -- إذا تم قبول الإيصال آلياً بثقة عالية جداً (95%+)
  IF NEW.status = 'auto_approved' 
     AND NEW.ai_confidence_score >= 95 
     AND OLD.status != 'auto_approved' THEN
    
    -- تحديث الحالة مباشرة إلى معتمد
    NEW.status := 'approved';
    NEW.finance_reviewed := true;
    NEW.finance_reviewed_at := NOW();
    NEW.contract_issued := true;
    
    -- توليد رقم عقد
    contract_num := 'B2F-AUTO-' || LPAD((SELECT COUNT(*) + 1 FROM b2f_contracts)::text, 6, '0');
    
    -- إصدار العقد تلقائياً
    INSERT INTO b2f_contracts (
      contract_number,
      sales_request_id,
      investor_phone,
      farm_id,
      opportunity_id,
      trees_count,
      amount_total,
      contract_type,
      start_date,
      status,
      created_at
    )
    VALUES (
      contract_num,
      NEW.id,
      NEW.investor_phone,
      NEW.farm_id,
      NEW.opportunity_id,
      COALESCE(NEW.number_of_trees, 1), -- تصحيح اسم الحقل
      NEW.total_amount,
      'tree_investment',
      NOW(),
      'active',
      NOW()
    )
    ON CONFLICT DO NOTHING; -- بدون (sales_request_id) لأنه لا يوجد unique constraint
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء الـ trigger
DROP TRIGGER IF EXISTS auto_issue_contract_trigger ON b2f_sales_requests;
CREATE TRIGGER auto_issue_contract_trigger
BEFORE UPDATE ON b2f_sales_requests
FOR EACH ROW
EXECUTE FUNCTION auto_issue_contract_on_approval();
