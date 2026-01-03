/*
  # نظام التنبيه قبل انتهاء الاشتراك

  1. Changes to user_subscriptions
    - إضافة حقل `last_reminder_sent` - آخر تنبيه تم إرساله
    - إضافة حقل `reminder_48h_sent` - تم إرسال تنبيه 48 ساعة
    - إضافة حقل `reminder_24h_sent` - تم إرسال تنبيه 24 ساعة
  
  2. Notes
    - يتم إرسال تنبيه عند 48 ساعة قبل الانتهاء
    - يتم إرسال تنبيه أقوى عند 24 ساعة قبل الانتهاء
    - تدخل المساعد الذكي برسالة تجديد
*/

-- إضافة حقل آخر تنبيه
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'last_reminder_sent'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN last_reminder_sent timestamptz;
  END IF;
END $$;

-- إضافة حقل تنبيه 48 ساعة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'reminder_48h_sent'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN reminder_48h_sent boolean DEFAULT false;
  END IF;
END $$;

-- إضافة حقل تنبيه 24 ساعة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'reminder_24h_sent'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN reminder_24h_sent boolean DEFAULT false;
  END IF;
END $$;
