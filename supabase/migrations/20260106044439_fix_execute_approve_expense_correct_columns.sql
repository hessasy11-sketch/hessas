/*
  # إصلاح دالة execute_approve_expense
  
  استخدام الأعمدة الصحيحة من farm_financial_ledger
*/

DROP FUNCTION IF EXISTS execute_approve_expense(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION execute_approve_expense(
  p_expense_id uuid,
  p_decision_id uuid,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense record;
  v_farm_name text;
BEGIN
  -- جلب بيانات المصروف
  SELECT 
    fe.*,
    bf.name as farm_name
  INTO v_expense
  FROM farm_expenses fe
  JOIN b2f_farms bf ON fe.farm_id = bf.id
  WHERE fe.id = p_expense_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Expense not found'
    );
  END IF;
  
  -- اعتماد المصروف
  UPDATE farm_expenses
  SET 
    approval_status = 'approved',
    approved_by = p_performed_by,
    approved_at = now()
  WHERE id = p_expense_id;
  
  -- تسجيل في السجل المالي
  INSERT INTO farm_financial_ledger (
    farm_id,
    entry_type,
    amount,
    description,
    category_name,
    created_by,
    is_approved,
    approved_by,
    approved_at
  ) VALUES (
    v_expense.farm_id,
    'expense',
    v_expense.amount,
    v_expense.description,
    v_expense.category,
    p_performed_by,
    true,
    p_performed_by,
    now()
  );
  
  -- تسجيل في executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'execute_approve_expense',
    v_expense.farm_id,
    p_decision_id,
    jsonb_build_object(
      'expense_id', p_expense_id,
      'amount', v_expense.amount,
      'category', v_expense.category,
      'description', v_expense.description
    ),
    p_performed_by,
    'success',
    format('تم اعتماد مصروف بقيمة %s ر.س لمزرعة %s', v_expense.amount, v_farm_name)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'expense_id', p_expense_id,
    'amount', v_expense.amount,
    'farm_name', v_farm_name,
    'message', 'Expense approved successfully'
  );
END;
$$;
