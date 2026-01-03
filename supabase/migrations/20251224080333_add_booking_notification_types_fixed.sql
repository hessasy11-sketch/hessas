/*
  # إضافة أنواع إشعارات الحجوزات

  ## التحديثات

  1. إضافة أنواع إشعارات الحجوزات إلى constraint جدول notifications
     - booking_confirmed: تأكيد الحجز
     - booking_completed: اكتمال الحجز
     - booking_cancelled: إلغاء الحجز

  2. الحفاظ على جميع الأنواع الموجودة حالياً

  ## السلوك

  - يسمح الآن بإنشاء إشعارات للحجوزات
  - متوافق مع trigger الإشعارات في tree_rental_reservations
*/

-- حذف constraint القديم
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- إضافة constraint جديد مع جميع الأنواع (الموجودة + الجديدة)
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'financial',
  'auction',
  'interaction',
  'ai_assistant',
  'system',
  'trial_started',
  'trial_ending',
  'trial_expired',
  'booking_confirmed',
  'booking_completed',
  'booking_cancelled'
));