/*
  # Insert Preset Work Scenarios

  1. Scenarios
    - HQ Super Admin - Full platform control
    - B2B Admin - Auction management
    - B2F Admin - Farm investment management
    - Farm Manager - Operations management
    - Farm Supervisor - Task execution and monitoring
    - Investor Service - Customer support
    - Finance Manager - Payment and invoice management

  2. Notes
    - Each scenario has specific landing route
    - Permissions aligned with department needs
    - Ready for immediate assignment to staff
*/

INSERT INTO work_scenarios (name, description, department, login_method, requires_pin, session_policy, scope_type, allowed_modules, allowed_actions, landing_route, is_active)
VALUES
  -- 1. HQ Super Admin
  (
    'مدير عام - صلاحيات كاملة',
    'صلاحيات كاملة للإدارة العليا - الوصول لجميع أقسام المنصة',
    'hq',
    'qr_pin',
    true,
    'idle_30m',
    'platform',
    ARRAY['hq_dashboard', 'scenario_generator', 'staff_management', 'all_reports', 'system_settings', 'audit_logs'],
    ARRAY['create', 'read', 'update', 'delete', 'approve', 'reject', 'assign', 'promote', 'view_all', 'configure_system'],
    '/hq',
    true
  ),

  -- 2. B2B Auctions Admin
  (
    'مدير مزادات B2B',
    'إدارة كاملة لقسم المزادات - مراجعة المزادات والمستخدمين والبلاغات',
    'b2b',
    'qr_pin',
    true,
    'idle_30m',
    'department',
    ARRAY['auctions_management', 'user_reports', 'auction_analytics', 'settings'],
    ARRAY['create', 'read', 'update', 'delete', 'approve', 'reject', 'block_user', 'resolve_report', 'view_analytics'],
    '/admin/auctions',
    true
  ),

  -- 3. B2F Investment Admin
  (
    'مدير استثمار المزارع B2F',
    'إدارة كاملة لقسم استثمار الأشجار - مراجعة الطلبات والعقود والمدفوعات',
    'b2f',
    'qr_pin',
    true,
    'idle_30m',
    'department',
    ARRAY['b2f_dashboard', 'investment_requests', 'contracts', 'payments', 'farms_management', 'opportunities'],
    ARRAY['create', 'read', 'update', 'delete', 'approve', 'reject', 'issue_contract', 'view_payments', 'manage_farms'],
    '/admin/b2f',
    true
  ),

  -- 4. Farm Manager
  (
    'مدير مزرعة',
    'إدارة عمليات المزرعة - إنشاء المهام وإدارة الفريق ومراجعة التقارير',
    'farm_ops',
    'qr_pin',
    true,
    'idle_30m',
    'farm',
    ARRAY['farm_operations', 'team_management', 'tasks', 'reports', 'maintenance'],
    ARRAY['create_task', 'assign_task', 'approve_work', 'view_reports', 'manage_team', 'submit_report'],
    '/admin/b2f/operations/manager-dashboard',
    true
  ),

  -- 5. Farm Supervisor
  (
    'مشرف تشغيلي',
    'تنفيذ المهام والإشراف على العمليات اليومية في المزرعة',
    'farm_ops',
    'qr_pin',
    true,
    'idle_30m',
    'farm',
    ARRAY['my_tasks', 'submit_proof', 'view_schedule'],
    ARRAY['view_tasks', 'update_task', 'submit_proof', 'mark_complete', 'request_help'],
    '/admin/b2f/operations/my-tasks',
    true
  ),

  -- 6. Investor Service Agent
  (
    'خدمة المستثمرين',
    'دعم المستثمرين - الرد على الاستفسارات ومتابعة الطلبات',
    'b2f',
    'qr_only',
    false,
    'idle_30m',
    'department',
    ARRAY['investor_requests', 'notifications', 'investor_profiles', 'support_tickets'],
    ARRAY['read', 'update', 'respond', 'escalate', 'send_notification'],
    '/admin/b2f/investor-service',
    true
  ),

  -- 7. Finance Manager
  (
    'مدير مالية',
    'إدارة المدفوعات والفواتير - مراجعة الإيصالات وإصدار العقود',
    'b2f',
    'qr_pin',
    true,
    'idle_30m',
    'department',
    ARRAY['payment_review', 'invoices', 'contracts', 'financial_reports'],
    ARRAY['read', 'approve', 'reject', 'issue_invoice', 'verify_receipt', 'view_financial_reports'],
    '/admin/b2f/finance',
    true
  )
ON CONFLICT DO NOTHING;
