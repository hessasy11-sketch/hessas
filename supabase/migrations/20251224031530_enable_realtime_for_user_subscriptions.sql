/*
  # تفعيل Real-time للاشتراكات

  1. Changes
    - تفعيل Real-time broadcasts لجدول user_subscriptions
    - يسمح بالتحديثات الفورية لحالة الاشتراكات
*/

-- Enable realtime for user_subscriptions table
ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;

COMMENT ON TABLE user_subscriptions IS 'اشتراكات المستخدمين مع دعم التحديثات الفورية';
