/*
  # إضافة عمود request_offer_type إلى جدول auctions
  
  1. التعديلات
    - إضافة عمود `request_offer_type` لتحديد نوع المزاد (طلب أو عرض) في قسم الشركات
    - القيم المسموحة: 'request', 'offer', أو null
    - يكون null للأقسام الأخرى التي لا تحتاج هذا التصنيف
  
  2. ملاحظات
    - هذا العمود اختياري ويستخدم فقط في قسم الشركات (companies)
    - العمود `auction_type` موجود مسبقاً ويختلف عن `request_offer_type`
*/

-- إضافة عمود request_offer_type إلى جدول auctions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'request_offer_type'
  ) THEN
    ALTER TABLE auctions ADD COLUMN request_offer_type text;
    
    -- إضافة قيد للتأكد من أن القيم المسموحة هي 'request' أو 'offer' أو null
    ALTER TABLE auctions ADD CONSTRAINT request_offer_type_check 
      CHECK (request_offer_type IN ('request', 'offer') OR request_offer_type IS NULL);
  END IF;
END $$;