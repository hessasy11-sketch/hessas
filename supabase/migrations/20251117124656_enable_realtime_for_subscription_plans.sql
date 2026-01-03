/*
  # تفعيل Real-time للباقات

  1. Changes
    - تفعيل Real-time broadcasts لجدول subscription_plans
    - السماح بمتابعة التغييرات الفورية على بيانات الباقات

  2. Security
    - لا تغيير في سياسات الأمان
    - فقط تفعيل البث المباشر للتحديثات
*/

-- Enable realtime for subscription_plans table
ALTER PUBLICATION supabase_realtime ADD TABLE subscription_plans;
