# Phase 5 Audit & Permissions Fix

## المشاكل المكتشفة

### 1. المراحل الخمسة غير مطبقة على لوحة الإدارة (HQDashboard)

**الوضع الحالي:**
- HQDashboard لا تستخدم أي من الأنظمة الخمسة
- يمكن الوصول إليها مباشرة بدون تحقق
- لا توجد حماية QR/PIN
- لا توجد إدارة جلسات
- لا توجد صلاحيات

**المطلوب:**
- تطبيق جميع المراحل الخمسة فعلياً
- حماية الوصول
- إدارة الجلسات
- التحقق من الصلاحيات

### 2. خلط في تنظيم الأقسام والصلاحيات

**المشكلة الرئيسية:**
- B2F (إدارة المزارع) و B2B (المزادات) مخلوطين
- الصلاحيات غير منظمة حسب التخصص
- موظفو المزارع يظهرون في غرف المزادات والعكس

**التصنيف الصحيح:**

```
Platform Organization
│
├── B2F Operations (استثمار المزارع)
│   ├── Farm Manager (مدير مزرعة)
│   ├── Operations Team (فريق العمليات)
│   ├── Finance Review (المراجعة المالية)
│   └── Investor Service (خدمة المستثمرين)
│
├── B2B Operations (المزادات)
│   ├── Auctions Manager (مدير المزادات)
│   ├── Bids Monitor (مراقب المزايدات)
│   ├── Quality Control (مراقبة الجودة)
│   └── Customer Support (خدمة العملاء)
│
├── Finance Department (المالية)
│   ├── CFO
│   ├── Accountants
│   └── Auditors
│
├── Marketing Department (التسويق)
│   ├── Marketing Manager
│   ├── Content Team
│   └── Analytics Team
│
└── Executive Management (الإدارة التنفيذية)
    ├── CEO
    ├── General Manager
    └── Board Members
```

## خطة الإصلاح

### Phase 1: تطبيق المراحل الخمسة على HQDashboard

1. **QR Access System**
   - إضافة QR Scanner في الدخول
   - التحقق من QR للمدير العام

2. **PIN System**
   - طلب PIN بعد QR
   - التحقق من الرقم السري

3. **Session Management**
   - إنشاء جلسة عند الدخول
   - تتبع الجلسة
   - إنهاء الجلسة عند الخروج

4. **Permission Packs**
   - تحميل حزمة صلاحيات المستخدم
   - التحقق من الصلاحيات قبل كل عملية
   - إخفاء الأقسام غير المسموح بها

5. **Absolute Control Mode**
   - زر السيطرة المطلقة في HQDashboard
   - حماية الأوامر الحساسة
   - التسجيل في Audit Logs

### Phase 2: فصل الصلاحيات والأقسام

1. **إنشاء Permission Packs متخصصة:**

```sql
-- B2F Permissions
- view_b2f_operations
- manage_farms
- approve_bookings
- view_farm_reports
- manage_farm_operations

-- B2B Permissions
- view_b2b_operations
- manage_auctions
- monitor_bids
- approve_sellers
- view_auction_reports

-- Finance Permissions
- view_financial_data
- approve_payments
- generate_reports
- audit_transactions

-- Marketing Permissions
- view_analytics
- manage_campaigns
- view_user_data
- generate_marketing_reports

-- Executive Permissions
- view_all_operations
- access_operations_room
- view_executive_logs
- absolute_control
- manage_staff
```

2. **ربط Roles بالأقسام:**

```typescript
// B2F Department
{
  department: 'b2f_operations',
  roles: [
    { name: 'farm_manager', permissions: ['b2f_*'] },
    { name: 'operations_team', permissions: ['view_b2f_*', 'manage_farm_operations'] }
  ]
}

// B2B Department
{
  department: 'b2b_operations',
  roles: [
    { name: 'auctions_manager', permissions: ['b2b_*'] },
    { name: 'bids_monitor', permissions: ['view_b2b_*', 'monitor_bids'] }
  ]
}
```

### Phase 3: تحديث Routing

```typescript
// Operations Room - يجب أن تكون محمية
/admin/operations-room → يتطلب executive_access
/admin/operations-room/b2f → يتطلب b2f_access OR executive_access
/admin/operations-room/b2b → يتطلب b2b_access OR executive_access
/admin/operations-room/finance → يتطلب finance_access OR executive_access
```

## Implementation Plan

### Step 1: Database Migrations
- إنشاء permission packs جديدة
- ربط الصلاحيات بالأقسام
- تحديث جداول platform_staff

### Step 2: Update HQDashboard
- إضافة Session Guard
- إضافة Permission Checks
- تطبيق جميع المراحل الخمسة

### Step 3: Update Operations Rooms
- فصل B2F عن B2B
- إضافة Permission Guards
- تحديث Navigation

### Step 4: Testing
- اختبار الوصول
- اختبار الصلاحيات
- اختبار الفصل بين الأقسام
