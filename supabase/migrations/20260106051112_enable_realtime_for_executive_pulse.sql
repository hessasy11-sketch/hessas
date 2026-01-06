/*
  # تفعيل Realtime للوحة المؤشرات العليا
  
  تفعيل realtime subscriptions للجداول المهمة
*/

-- محاولة إضافة الجداول (تجاهل الأخطاء إذا كانت موجودة)
DO $$
BEGIN
  -- b2f_farms
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE b2f_farms';
    RAISE NOTICE 'Added b2f_farms to realtime';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'b2f_farms already in realtime';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add b2f_farms: %', SQLERRM;
  END;

  -- farm_expenses
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE farm_expenses';
    RAISE NOTICE 'Added farm_expenses to realtime';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'farm_expenses already in realtime';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add farm_expenses: %', SQLERRM;
  END;

  -- b2f_sales_requests
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE b2f_sales_requests';
    RAISE NOTICE 'Added b2f_sales_requests to realtime';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'b2f_sales_requests already in realtime';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add b2f_sales_requests: %', SQLERRM;
  END;

  -- decision_queue
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE decision_queue';
    RAISE NOTICE 'Added decision_queue to realtime';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'decision_queue already in realtime';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add decision_queue: %', SQLERRM;
  END;

  -- executive_logs
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE executive_logs';
    RAISE NOTICE 'Added executive_logs to realtime';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'executive_logs already in realtime';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add executive_logs: %', SQLERRM;
  END;
END $$;
