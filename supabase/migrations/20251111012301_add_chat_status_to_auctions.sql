/*
  # إضافة حالة الشات للمزادات

  1. التغييرات
    - إضافة عمود `chat_status` للتحكم في حالة الشات (مفتوح/مغلق)
    - القيمة الافتراضية: 'active' (مفتوح)
    - القيم المسموحة: 'active', 'closed'
  
  2. الهدف
    - السماح لأصحاب المزادات بإغلاق وفتح الشات متى أرادوا
    - التحكم الكامل في المزايدات والرسائل
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'chat_status'
  ) THEN
    ALTER TABLE auctions ADD COLUMN chat_status text DEFAULT 'active' CHECK (chat_status IN ('active', 'closed'));
  END IF;
END $$;
