/*
  # إصلاح العلاقة المزدوجة بين الطلبات والفواتير

  1. المشكلة
    - يوجد علاقتين بين b2f_investment_requests و b2f_invoices
    - هذا يسبب خطأ PGRST201 عند محاولة تضمين البيانات

  2. الحل
    - إزالة العلاقة الزائدة (invoice_id من b2f_investment_requests)
    - الاحتفاظ بالعلاقة الصحيحة (request_id في b2f_invoices)
    
  3. العلاقة النهائية
    - b2f_invoices.request_id → b2f_investment_requests.id (علاقة واحدة لواحد)
*/

-- إزالة القيد الخارجي والعمود الزائد
ALTER TABLE b2f_investment_requests 
DROP CONSTRAINT IF EXISTS b2f_investment_requests_invoice_id_fkey;

ALTER TABLE b2f_investment_requests 
DROP COLUMN IF EXISTS invoice_id;

-- التأكد من وجود العلاقة الصحيحة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'b2f_invoices_request_id_fkey'
  ) THEN
    ALTER TABLE b2f_invoices
    ADD CONSTRAINT b2f_invoices_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES b2f_investment_requests(id) ON DELETE CASCADE;
  END IF;
END $$;
