# نظام القرارات المتكامل - 4 مراحل ✅

## نظرة شاملة على النظام الكامل

تم بناء نظام قرارات احترافي متكامل عبر 4 مراحل متتالية، كل مرحلة تبني على السابقة.

---

## 📊 الهيكل الكامل

```
┌─────────────────────────────────────────────────────┐
│  المرحلة 1: Decision Queue (طابور القرارات)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • إنشاء قرارات                                    │
│  • تصنيف حسب الأولوية                              │
│  • الموافقة/الرفض/المراجعة                        │
│  • حفظ بيانات القرار في action_data               │
└──────────────────┬──────────────────────────────────┘
                   │ عند الموافقة ↓
┌─────────────────────────────────────────────────────┐
│  المرحلة 4: Authority Check (التحقق من الصلاحيات)  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • 🔐 هل يملك حق الموافقة؟                         │
│  • 🔐 هل يستوفي الشروط؟ (مثل: max_amount)         │
│  • ❌ رفض إذا لم يكن مصرحاً                        │
│  • ✅ السماح إذا كان لديه صلاحية                   │
└──────────────────┬──────────────────────────────────┘
                   │ إذا مصرح له ↓
┌─────────────────────────────────────────────────────┐
│  المرحلة 3: Controlled Execution (التنفيذ التلقائي)│
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • 🔥 تنفيذ القرار مباشرة                          │
│  • 🔥 تحديث الجداول المرتبطة                       │
│  • 🔥 حفظ نتيجة التنفيذ                            │
│  • ✅ تحديث executed = true                        │
└──────────────────┬──────────────────────────────────┘
                   │ أثناء وبعد كل خطوة ↓
┌─────────────────────────────────────────────────────┐
│  المرحلة 2: Executive Log (السجل القانوني)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • 📝 تسجيل كل إجراء                               │
│  • 📝 من قام به ومتى                              │
│  • 📝 النتيجة والملاحظات                          │
│  • 🔒 غير قابل للتعديل أو الحذف                   │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 المرحلة 1: Decision Queue

### الجداول:
- `decision_queue` - طابور القرارات

### الأنواع المدعومة:
1. **approve_expense** - اعتماد مصروف
2. **suspend_bookings** - إيقاف حجوزات مزرعة
3. **change_farm_manager** - تغيير مدير مزرعة
4. **cancel_auction** - إلغاء مزاد

### الحالات:
- `pending` - بانتظار المراجعة
- `approved` - معتمد
- `rejected` - مرفوض

### الأولويات:
- `urgent` - عاجل
- `high` - عالي
- `normal` - عادي
- `low` - منخفض

---

## 🎯 المرحلة 2: Executive Log

### الجداول:
- `executive_logs` - السجل القانوني

### أنواع الإجراءات المسجلة:
- `approve_decision` - الموافقة على قرار
- `reject_decision` - رفض قرار
- `execute_approve_expense` - تنفيذ اعتماد مصروف
- `execute_suspend_bookings` - تنفيذ إيقاف حجوزات
- `execute_change_farm_manager` - تنفيذ تغيير مدير
- `execute_cancel_auction` - تنفيذ إلغاء مزاد

### الميزات:
- ✅ تسجيل كامل لكل إجراء
- ✅ من قام به (performed_by)
- ✅ متى (created_at)
- ✅ النتيجة (result)
- ✅ الملاحظات (notes)
- 🔒 غير قابل للتعديل

---

## 🎯 المرحلة 3: Controlled Execution

### الدوال التنفيذية:

#### 1. `execute_approve_expense()`
```
المدخلات: expense_id, decision_id, performed_by
المهمة:
  ✅ اعتماد المصروف في farm_expenses
  ✅ تسجيل في farm_financial_ledger
  ✅ تسجيل في executive_logs
المخرجات: {success, expense_id, amount, farm_name}
```

#### 2. `execute_suspend_bookings()`
```
المدخلات: farm_id, decision_id, performed_by, reason
المهمة:
  ✅ تغيير operational_status إلى suspended
  ✅ إلغاء جميع الحجوزات المعلقة
  ✅ عد الحجوزات الملغاة
المخرجات: {success, farm_id, affected_bookings}
```

#### 3. `execute_change_farm_manager()`
```
المدخلات: farm_id, new_manager_id, decision_id, performed_by
المهمة:
  ✅ تحديث farm_manager_id
  ✅ حفظ المدير القديم في السجل
المخرجات: {success, old_manager_id, new_manager_id}
```

#### 4. `execute_cancel_auction()`
```
المدخلات: auction_id, decision_id, performed_by, reason
المهمة:
  ✅ تحديث حالة المزاد إلى cancelled
  ✅ حفظ الحالة القديمة
المخرجات: {success, auction_id, old_status}
```

### الدالة الرئيسية:
#### `execute_approved_decision()`
- توجه التنفيذ إلى الدالة المناسبة حسب نوع القرار
- تحدّث `executed = true` و `execution_result`

---

## 🎯 المرحلة 4: Authority Check

### الجداول:
- `decision_authorities` - صلاحيات القرارات

### الصلاحيات الافتراضية:
```
┌──────────────────────┬─────────────────┬──────────────────┐
│ نوع القرار           │ الدور المسموح  │ الشروط          │
├──────────────────────┼─────────────────┼──────────────────┤
│ suspend_bookings     │ super_admin     │ بدون شروط       │
│ approve_expense      │ farms_manager   │ max_amount: 5000 │
│ approve_expense      │ super_admin     │ بدون شروط       │
│ change_farm_manager  │ super_admin     │ بدون شروط       │
│ cancel_auction       │ super_admin     │ بدون شروط       │
│ cancel_auction       │ admin           │ بدون شروط       │
└──────────────────────┴─────────────────┴──────────────────┘
```

### الدوال:

#### `can_approve_decision(decision_id, staff_id)`
```typescript
// التحقق من الصلاحية
const result = await can_approve_decision(decision_id, staff_id);

// نتيجة:
{
  can_approve: true,
  staff_role: "farms_manager",
  decision_type: "approve_expense",
  reason: "Has authority"
}
```

#### `add_decision_authority(...)`
```typescript
// إضافة صلاحية جديدة
await add_decision_authority(
  'approve_expense',
  'farm_manager',
  { max_amount: 3000 },
  'يمكنه اعتماد حتى 3000 ر.س',
  'Can approve up to 3000 SAR'
);
```

---

## 🔄 التدفق الكامل (من البداية للنهاية)

```
1. إنشاء قرار
   ↓
   INSERT INTO decision_queue
   ↓

2. محاولة الموافقة
   ↓
   approve_decision_b2f(decision_id, staff_id)
   ↓

3. التحقق من الصلاحيات 🔐
   ↓
   can_approve_decision(decision_id, staff_id)
   ↓
   if (لا يملك صلاحية) → ❌ رفض
   if (يملك صلاحية) → ✅ متابعة
   ↓

4. اعتماد القرار
   ↓
   UPDATE decision_queue SET status = 'approved'
   ↓
   تسجيل في executive_logs (approve_decision)
   ↓

5. تنفيذ القرار تلقائياً 🔥
   ↓
   execute_approved_decision(decision_id, staff_id)
   ↓
   تنفيذ الإجراء المطلوب
   ↓
   UPDATE decision_queue SET executed = true
   ↓
   تسجيل في executive_logs (execute_*)
   ↓

6. ✅ تم بنجاح
```

---

## 📊 الإحصائيات الإجمالية

### الجداول:
- `decision_queue` - القرارات
- `decision_authorities` - الصلاحيات
- `executive_logs` - السجل
- `farm_expenses` - المصروفات

### الدوال (20+ دالة):
1. `can_approve_decision()`
2. `approve_decision_b2f()`
3. `reject_decision_b2f()`
4. `execute_approved_decision()`
5. `execute_approve_expense()`
6. `execute_suspend_bookings()`
7. `execute_change_farm_manager()`
8. `execute_cancel_auction()`
9. `get_decision_authorities()`
10. `add_decision_authority()`
11. `remove_decision_authority()`
12. `get_all_decision_types_with_authorities()`
13. `get_pending_b2f_decisions()`
14. `get_approvable_decisions()`
15. `create_farm_decision()`
... والمزيد

### الواجهات:
- `/admin/settings/authority` - إدارة الصلاحيات
- `DecisionQueuePanel` - طابور القرارات
- `ExecutiveLogsView` - السجل القانوني
- `ExecutiveDecisionsLog` - سجل القرارات

---

## 🧪 سيناريو اختبار كامل

### السيناريو: اعتماد مصروف 8000 ر.س

#### المحاولة 1: مدير المزارع
```
1. إنشاء قرار (8000 ر.س)
   ✅ Decision created

2. مدير المزارع يحاول الموافقة
   ↓
   can_approve_decision() → false
   ↓
   ❌ Unauthorized: No matching authority rule found

3. النتيجة: مرفوض ❌
```

#### المحاولة 2: المدير العام
```
1. نفس القرار (8000 ر.س)

2. المدير العام يحاول الموافقة
   ↓
   can_approve_decision() → true
   ↓
   ✅ Has authority

3. الموافقة
   ✅ Decision approved

4. التنفيذ التلقائي
   ✅ Expense approved in farm_expenses
   ✅ Logged in farm_financial_ledger
   ✅ Logged in executive_logs

5. النتيجة: نجح ✅
```

---

## 🎯 الميزات الرئيسية

### 1. الأمان 🔒
- ✅ لا موافقة بدون صلاحية
- ✅ التحقق من الصلاحيات في كل خطوة
- ✅ تسجيل كامل لكل إجراء
- ✅ RLS Policies محكمة

### 2. المرونة 🔧
- ✅ دعم شروط مخصصة (مثل: max_amount)
- ✅ إضافة/حذف صلاحيات بسهولة
- ✅ أنواع قرارات قابلة للتوسع
- ✅ أولويات قابلة للتخصيص

### 3. الشفافية 👁️
- ✅ سجل كامل غير قابل للتعديل
- ✅ من قام بماذا ومتى
- ✅ النتائج والملاحظات
- ✅ تتبع التنفيذ

### 4. الأداء ⚡
- ✅ تنفيذ تلقائي بعد الموافقة
- ✅ لا حاجة لخطوات يدوية
- ✅ معاملات آمنة (ACID)
- ✅ فهارس محسنة

---

## 📝 الخلاصة

تم بناء نظام قرارات احترافي متكامل يضمن:

1. **الأمان الكامل** - صلاحيات محكمة وتسجيل شامل
2. **التنفيذ التلقائي** - لا حاجة لخطوات يدوية
3. **المرونة العالية** - شروط مخصصة لكل حالة
4. **الشفافية المطلقة** - سجل قانوني غير قابل للتعديل

النظام جاهز للاستخدام في الإنتاج ويمكن توسعته بسهولة لدعم أنواع قرارات جديدة.

---

## 🚀 Build Status

```
✅ Phase 1: Decision Queue - COMPLETE
✅ Phase 2: Executive Log - COMPLETE
✅ Phase 3: Controlled Execution - COMPLETE
✅ Phase 4: Authority Check - COMPLETE
✅ Full System Integration - COMPLETE
✅ Build Successful
```

**النظام الكامل جاهز ويعمل! 🎉**
