/*
  # إصلاح دوال التجربة المجانية - استخدام الجدول الصحيح

  1. المشكلة
    - دالة start_free_trial تحاول الكتابة في جدول 'activity_logs' غير موجود
    - دالة end_free_trial نفس المشكلة
    - الجدول الصحيح هو 'subscription_action_logs'
    
  2. الحل
    - تحديث start_free_trial لاستخدام subscription_action_logs
    - تحديث end_free_trial لاستخدام subscription_action_logs
    - استخدام الأعمدة الصحيحة: action_type, action_data
    
  3. التحسينات
    - إزالة الاعتماد على جداول غير موجودة
    - استخدام البنية الصحيحة للجدول
*/

-- تحديث دالة بدء التجربة المجانية
CREATE OR REPLACE FUNCTION start_free_trial(
  p_user_id uuid,
  p_plan_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan record;
  v_subscription_id uuid;
  v_ends_at timestamptz;
  v_existing_subscription record;
BEGIN
  -- جلب بيانات الباقة
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = p_plan_id
  AND is_active = true
  AND free_trial_days > 0;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الباقة غير متاحة أو لا تدعم التجربة المجانية'
    );
  END IF;

  -- التحقق من عدم وجود اشتراك نشط
  SELECT * INTO v_existing_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
  AND status = 'active';

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لديك اشتراك نشط بالفعل'
    );
  END IF;

  -- حساب تاريخ الانتهاء
  v_ends_at := NOW() + (v_plan.free_trial_days || ' days')::interval;

  -- إنشاء الاشتراك التجريبي
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    is_trial,
    trial_started_at,
    trial_ends_at,
    starts_at,
    ends_at,
    auto_renew
  ) VALUES (
    p_user_id,
    p_plan_id,
    'active',
    true,
    NOW(),
    v_ends_at,
    NOW(),
    v_ends_at,
    false
  )
  RETURNING id INTO v_subscription_id;

  -- تحديث نوع الباقة للمستخدم
  UPDATE profiles
  SET current_plan_type = v_plan.plan_type
  WHERE id = p_user_id;

  -- إنشاء إشعار
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    is_read
  ) VALUES (
    p_user_id,
    'trial_started',
    '🎉 بدأت تجربتك المجانية!',
    format('مرحباً بك في الباقة %s! لديك %s يوم لاستكشاف جميع المميزات.', v_plan.name_ar, v_plan.free_trial_days),
    false
  );

  -- تسجيل النشاط في الجدول الصحيح
  INSERT INTO subscription_action_logs (
    user_id,
    admin_id,
    action_type,
    action_data,
    notes
  ) VALUES (
    p_user_id,
    NULL,
    'free_trial_started',
    json_build_object(
      'plan_id', p_plan_id,
      'plan_name', v_plan.name_ar,
      'trial_days', v_plan.free_trial_days,
      'ends_at', v_ends_at,
      'subscription_id', v_subscription_id
    ),
    format('بدأ المستخدم تجربة مجانية للباقة %s لمدة %s يوم', v_plan.name_ar, v_plan.free_trial_days)
  );

  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'ends_at', v_ends_at,
    'trial_days', v_plan.free_trial_days,
    'message', 'تم بدء التجربة المجانية بنجاح!'
  );
END;
$$;

-- تحديث دالة إنهاء التجربة المجانية
CREATE OR REPLACE FUNCTION end_free_trial(
  p_subscription_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription record;
  v_user_id uuid;
BEGIN
  -- جلب بيانات الاشتراك
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE id = p_subscription_id
  AND is_trial = true
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الاشتراك غير موجود أو غير نشط'
    );
  END IF;

  v_user_id := v_subscription.user_id;

  -- تحديث حالة الاشتراك
  UPDATE user_subscriptions
  SET 
    status = 'expired',
    auto_downgraded = true,
    downgraded_at = NOW()
  WHERE id = p_subscription_id;

  -- إعادة المستخدم للباقة المجانية
  UPDATE profiles
  SET current_plan_type = 'free'
  WHERE id = v_user_id;

  -- إنشاء إشعار
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    is_read
  ) VALUES (
    v_user_id,
    'trial_ended',
    '⏰ انتهت تجربتك المجانية',
    'لقد انتهت فترة التجربة المجانية. اشترك الآن للاستمرار في الاستفادة من جميع المميزات!',
    false
  );

  -- تسجيل النشاط في الجدول الصحيح
  INSERT INTO subscription_action_logs (
    user_id,
    admin_id,
    action_type,
    action_data,
    notes
  ) VALUES (
    v_user_id,
    NULL,
    'free_trial_ended',
    json_build_object(
      'subscription_id', p_subscription_id,
      'ended_at', NOW()
    ),
    'انتهت التجربة المجانية وتم إرجاع المستخدم للباقة المجانية'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'تم إنهاء التجربة المجانية'
  );
END;
$$;

-- تعليقات
COMMENT ON FUNCTION start_free_trial(uuid, uuid) IS 'Starts free trial for a user, logs to subscription_action_logs';
COMMENT ON FUNCTION end_free_trial(uuid) IS 'Ends free trial and downgrades user to free plan, logs to subscription_action_logs';
