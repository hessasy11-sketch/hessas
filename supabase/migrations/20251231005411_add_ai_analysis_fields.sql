/*
  # إضافة حقول تحليل الذكاء الصناعي للإيصالات

  1. الحقول الجديدة
    - ai_confidence_score: نسبة ثقة AI (0-1)
    - ai_analysis_result: نتيجة التحليل الكاملة (JSONB)

  2. الهدف
    - تخزين نتائج تحليل AI للإيصالات
    - عرض التفاصيل للمستخدم والإدارة
*/

-- إضافة حقل نسبة الثقة
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_sales_requests' 
    AND column_name = 'ai_confidence_score'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN ai_confidence_score decimal(3,2);
  END IF;
END $$;

-- إضافة حقل نتيجة التحليل الكاملة
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_sales_requests' 
    AND column_name = 'ai_analysis_result'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN ai_analysis_result jsonb;
  END IF;
END $$;

-- إضافة تعليق
COMMENT ON COLUMN b2f_sales_requests.ai_confidence_score IS 
'نسبة ثقة الذكاء الصناعي في تحليل الإيصال (0-1)';

COMMENT ON COLUMN b2f_sales_requests.ai_analysis_result IS 
'نتيجة تحليل الذكاء الصناعي الكاملة للإيصال (JSON)';
