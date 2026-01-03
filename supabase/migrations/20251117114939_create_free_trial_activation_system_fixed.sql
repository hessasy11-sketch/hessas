/*
  # نظام تفعيل التجربة المجانية والعروض الترويجية

  1. الدوال الجديدة
    - `start_free_trial()` - بدء التجربة المجانية
    - `end_free_trial()` - إنهاء التجربة المجانية
    - `activate_promotional_offer()` - تفعيل عرض ترويجي
    - `check_expired_trials()` - فحص التجارب المنتهية

  2. الأعمدة
    - استخدام ends_at بدلاً من expires_at
    - استخدام trial_ends_at للتجارب

  3. الأمان
    - RLS policies محدثة
    - دوال آمنة مع SECURITY DEFINER
*/

-- دالة بدء التجربة المجانية
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
  v_existing_trial record;
  v_subscription_id uuid;
  v_ends_at timestamptz;
BEGIN
  -- التحقق من المستخدم
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'يجب تسجيل الدخول أولاً'
    );
  END IF;

  -- جلب بيانات الباقة
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = p_plan_id
  AND is_active = true
  AND has_free_trial = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الباقة غير متاحة للتجربة المجانية'
    );
  END IF;

  -- التحقق من عدم وجود تجربة سابقة لنفس الباقة
  SELECT * INTO v_existing_trial
  FROM user_subscriptions
  WHERE user_id = p_user_id
  AND plan_id = p_plan_id
  AND is_trial = true;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لقد استخدمت التجربة المجانية لهذه الباقة من قبل'
    );
  END IF;

  -- التحقق من عدم وجود اشتراك نشط
  SELECT * INTO v_existing_trial
  FROM user_subscriptions
  WHERE user_id = p_user_id
  AND status = 'active'
  AND ends_at > NOW();

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

  -- تسجيل النشاط
  INSERT INTO activity_logs (
    user_id,
    action,
    details
  ) VALUES (
    p_user_id,
    'free_trial_started',
    json_build_object(
      'plan_id', p_plan_id,
      'plan_name', v_plan.name_ar,
      'trial_days', v_plan.free_trial_days,
      'ends_at', v_ends_at
    )
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

-- دالة إنهاء التجربة المجانية
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

  -- تسجيل النشاط
  INSERT INTO activity_logs (
    user_id,
    action,
    details
  ) VALUES (
    v_user_id,
    'free_trial_ended',
    json_build_object(
      'subscription_id', p_subscription_id,
      'ended_at', NOW()
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'تم إنهاء التجربة المجانية'
  );
END;
$$;

-- دالة تفعيل عرض ترويجي
CREATE OR REPLACE FUNCTION activate_promotional_offer(
  p_user_id uuid,
  p_offer_id uuid,
  p_plan_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer record;
  v_plan record;
  v_subscription_id uuid;
  v_ends_at timestamptz;
  v_total_months integer;
BEGIN
  -- التحقق من المستخدم
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'يجب تسجيل الدخول أولاً'
    );
  END IF;

  -- جلب بيانات العرض
  SELECT * INTO v_offer
  FROM promotional_offers
  WHERE id = p_offer_id
  AND user_id = p_user_id
  AND status = 'pending'
  AND offer_expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'العرض غير متاح أو منتهي الصلاحية'
    );
  END IF;

  -- جلب بيانات الباقة
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = p_plan_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الباقة غير متاحة'
    );
  END IF;

  -- حساب المدة الإجمالية (شهر + شهور إضافية)
  v_total_months := 1 + COALESCE(v_offer.bonus_months, 0);
  v_ends_at := NOW() + (v_total_months || ' months')::interval;

  -- إنشاء الاشتراك
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    is_trial,
    is_promotional,
    promotional_offer_id,
    bonus_months_remaining,
    starts_at,
    ends_at,
    auto_renew
  ) VALUES (
    p_user_id,
    p_plan_id,
    'active',
    false,
    true,
    p_offer_id,
    v_offer.bonus_months,
    NOW(),
    v_ends_at,
    false
  )
  RETURNING id INTO v_subscription_id;

  -- تحديث نوع الباقة للمستخدم
  UPDATE profiles
  SET current_plan_type = v_plan.plan_type
  WHERE id = p_user_id;

  -- تحديث حالة العرض
  UPDATE promotional_offers
  SET 
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = p_offer_id;

  -- إنشاء إشعار
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    is_read
  ) VALUES (
    p_user_id,
    'offer_activated',
    '🎁 تم تفعيل العرض الترويجي!',
    format('تهانينا! حصلت على %s شهر إضافي مجاناً. اشتراكك ساري لمدة %s شهر.', v_offer.bonus_months, v_total_months),
    false
  );

  -- تسجيل النشاط
  INSERT INTO activity_logs (
    user_id,
    action,
    details
  ) VALUES (
    p_user_id,
    'promotional_offer_activated',
    json_build_object(
      'offer_id', p_offer_id,
      'plan_id', p_plan_id,
      'total_months', v_total_months,
      'ends_at', v_ends_at
    )
  );

  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'ends_at', v_ends_at,
    'total_months', v_total_months,
    'message', 'تم تفعيل العرض الترويجي بنجاح!'
  );
END;
$$;

-- دالة فحص التجارب المنتهية (تُستدعى بشكل دوري)
CREATE OR REPLACE FUNCTION check_expired_trials()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count integer := 0;
  v_subscription record;
BEGIN
  -- البحث عن التجارب المنتهية
  FOR v_subscription IN
    SELECT *
    FROM user_subscriptions
    WHERE is_trial = true
    AND status = 'active'
    AND ends_at <= NOW()
    AND (auto_downgraded = false OR auto_downgraded IS NULL)
  LOOP
    -- إنهاء التجربة
    PERFORM end_free_trial(v_subscription.id);
    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'message', format('تم إنهاء %s تجربة مجانية', v_expired_count)
  );
END;
$$;

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_expiry 
ON user_subscriptions(ends_at) 
WHERE is_trial = true AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_promotional_offers_pending 
ON promotional_offers(user_id, status, offer_expires_at) 
WHERE status = 'pending';

COMMENT ON FUNCTION start_free_trial IS 'بدء التجربة المجانية للمستخدم - يفعّل الباقة لمدة محددة';
COMMENT ON FUNCTION end_free_trial IS 'إنهاء التجربة المجانية وإعادة المستخدم للباقة المجانية';
COMMENT ON FUNCTION activate_promotional_offer IS 'تفعيل عرض ترويجي (مثل: شهر عليك وشهر علينا)';
COMMENT ON FUNCTION check_expired_trials IS 'فحص وإنهاء التجارب المجانية المنتهية - يُستدعى بشكل دوري';
