/*
  # إصلاح constraint للإشعارات - إضافة أنواع التجارب

  1. المشكلة
    - دالة start_free_trial تحاول إضافة notification بنوع 'trial_started'
    - دالة end_free_trial تحاول إضافة notification بنوع 'trial_ended'
    - هذه الأنواع غير موجودة في notifications_type_check constraint
    
  2. الحل
    - تحديث constraint لإضافة الأنواع المفقودة:
      - 'trial_started'
      - 'trial_ended'
      - 'subscription' (للإشعارات المتعلقة بالاشتراكات)
    
  3. الأنواع المتاحة بعد التحديث
    - 'financial' (معاملات مالية)
    - 'auction' (مزادات)
    - 'interaction' (تفاعلات)
    - 'ai_assistant' (المساعد الذكي)
    - 'system' (نظام)
    - 'subscription' (اشتراكات)
    - 'trial_started' (بدء تجربة)
    - 'trial_ended' (انتهاء تجربة)
*/

-- حذف الـ constraint القديمة
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- إضافة الـ constraint الجديدة مع جميع الأنواع
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'financial'::text,
  'auction'::text,
  'interaction'::text,
  'ai_assistant'::text,
  'system'::text,
  'subscription'::text,
  'trial_started'::text,
  'trial_ended'::text
]));

-- تعليق
COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 
'Allowed notification types including trial and subscription notifications';
