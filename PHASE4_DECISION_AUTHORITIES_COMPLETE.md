# المرحلة 4: نظام صلاحيات القرارات (Decision Authorities) ✅

## نظرة عامة

تم تطوير نظام متكامل لتحديد **من يملك حق اعتماد كل نوع من القرارات** مع دعم الشروط المخصصة.

---

## 📊 ما تم تنفيذه

### 1️⃣ Backend: جدول الصلاحيات

#### `decision_authorities` Table
```sql
- decision_type: نوع القرار
- allowed_role: الدور المسموح له
- conditions: شروط إضافية (jsonb)
- description_ar/en: الوصف
- is_active: نشط/غير نشط
```

**الصلاحيات الافتراضية:**
```
suspend_bookings → super_admin فقط
approve_expense (< 5000) → farms_manager + super_admin
approve_expense (أي مبلغ) → super_admin
change_farm_manager → super_admin فقط
cancel_auction → super_admin + admin
```

---

### 2️⃣ Backend: دوال التحقق

#### `can_approve_decision(decision_id, staff_id)`
**الوظيفة:** التحقق من صلاحية الموظف لاعتماد قرار معين

**المدخلات:**
- `decision_id`: معرف القرار
- `staff_id`: معرف الموظف

**المخرجات:**
```json
{
  "can_approve": true/false,
  "staff_role": "farms_manager",
  "decision_type": "approve_expense",
  "reason": "Has authority" | "No matching authority rule found"
}
```

**آلية العمل:**
1. جلب بيانات القرار ودور الموظف
2. البحث عن صلاحيات مطابقة
3. التحقق من الشروط الإضافية (مثل: max_amount)
4. إرجاع النتيجة

---

#### `get_decision_authorities(decision_type)`
**الوظيفة:** جلب جميع الأدوار المسموح لها باعتماد نوع قرار معين

**مثال:**
```sql
SELECT * FROM get_decision_authorities('approve_expense');

نتيجة:
- farms_manager (max_amount: 5000)
- super_admin (بدون شروط)
```

---

#### `add_decision_authority(...)`
**الوظيفة:** إضافة صلاحية جديدة

**المدخلات:**
- `decision_type`
- `allowed_role`
- `conditions` (optional)
- `description_ar/en`

---

#### `remove_decision_authority(authority_id)`
**الوظيفة:** إزالة صلاحية (soft delete)

---

#### `get_all_decision_types_with_authorities()`
**الوظيفة:** جلب جميع أنواع القرارات مع صلاحياتها

**المخرجات:**
```json
[
  {
    "decision_type": "approve_expense",
    "decision_name_ar": "اعتماد مصروف",
    "decision_name_en": "Approve Expense",
    "authorities": [...]
  }
]
```

---

### 3️⃣ تكامل مع نظام الموافقة

#### تحديث `approve_decision_b2f()`

**قبل:**
```
approve_decision_b2f(decision_id, staff_id, notes)
  → الموافقة مباشرة
```

**بعد:**
```
approve_decision_b2f(decision_id, staff_id, notes)
  → 🔐 التحقق من الصلاحيات
  → إذا لم يكن لديه صلاحية: رفض مع رسالة
  → إذا كان لديه صلاحية: الموافقة والتنفيذ
```

**مثال على الرفض:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "reason": "No matching authority rule found",
  "staff_role": "farms_manager",
  "decision_type": "suspend_bookings"
}
```

---

### 4️⃣ Frontend: واجهة الإدارة

#### المسار: `/admin/settings/authority`

**الميزات:**
1. **عرض جميع أنواع القرارات** مع صلاحياتها
2. **إضافة صلاحية جديدة** لأي نوع قرار
3. **حذف صلاحية** موجودة
4. **دعم الشروط المخصصة** (مثل: max_amount)
5. **واجهة تفاعلية** مع ألوان مميزة لكل دور

**المكونات:**
- `DecisionAuthoritiesView.tsx`: الواجهة الرئيسية
- `useDecisionAuthorities.ts`: Hook للتعامل مع الصلاحيات

---

## 🧪 نتائج الاختبارات

### اختبار 1: مدير المزارع + مصروف صغير (3000 ر.س)
```
✅ Can Approve: true
✅ Reason: Has authority
```

### اختبار 2: مدير المزارع + مصروف كبير (8000 ر.س)
```
❌ Can Approve: false
❌ Reason: No matching authority rule found
```

### اختبار 3: المدير العام + مصروف كبير (8000 ر.س)
```
✅ Can Approve: true
✅ Reason: Has authority
```

### اختبار 4: مدير المزارع + إيقاف مزرعة
```
❌ Can Approve: false
❌ Reason: No matching authority rule found
```

### اختبار 5: المدير العام + إيقاف مزرعة
```
✅ Can Approve: true
✅ Reason: Has authority
```

---

## 📈 الإحصائيات

### توزيع الصلاحيات:
```
approve_expense:      2 أدوار (farms_manager + super_admin)
cancel_auction:       2 أدوار (admin + super_admin)
change_farm_manager:  1 دور (super_admin)
suspend_bookings:     1 دور (super_admin)
```

### الأدوار وصلاحياتها:
```
super_admin:     4 أنواع قرارات (صلاحيات كاملة)
farms_manager:   1 نوع قرار (مع شرط max_amount)
admin:           1 نوع قرار
```

### الشروط المخصصة:
```
farms_manager → approve_expense: max_amount = 5000
```

---

## 🔐 الحماية والأمان

### الضمانات:
1. ✅ **التحقق قبل الموافقة** - لا موافقة بدون صلاحية
2. ✅ **دعم الشروط المخصصة** - قواعد مرنة لكل حالة
3. ✅ **تسجيل كامل** - كل محاولة موافقة مسجلة
4. ✅ **Soft Delete** - الصلاحيات لا تُحذف، تُعطّل فقط
5. ✅ **RLS Policies** - حماية على مستوى قاعدة البيانات

### RLS Policies:
```sql
-- القراءة: الجميع
"Anyone can read decision_authorities"

-- الكتابة: المسؤولون فقط
"Admins can manage decision_authorities"
  WHERE role IN ('super_admin', 'admin')
```

---

## 🎯 حالات الاستخدام

### مثال 1: إضافة صلاحية جديدة
```typescript
await addAuthority(
  'approve_expense',     // نوع القرار
  'farm_manager',        // الدور
  { max_amount: 3000 },  // شروط
  'يمكنه اعتماد حتى 3000 ر.س',  // وصف عربي
  'Can approve up to 3000 SAR'  // وصف إنجليزي
);
```

### مثال 2: التحقق من الصلاحية قبل الموافقة
```typescript
const check = await canApproveDecision(decisionId, staffId);
if (check.can_approve) {
  // السماح بالموافقة
} else {
  // عرض رسالة: "ليس لديك صلاحية"
}
```

### مثال 3: جلب القرارات التي يمكن اعتمادها
```sql
SELECT * FROM get_approvable_decisions(staff_id);
-- يُرجع فقط القرارات التي لديه صلاحية اعتمادها
```

---

## 🔗 التكامل الكامل (4 مراحل)

```
┌─────────────────────────────────────────────────────┐
│  المرحلة 1: Decision Queue (طابور القرارات)        │
│  ✅ إنشاء قرارات                                    │
└──────────────────┬──────────────────────────────────┘
                   │ عند الموافقة ↓
┌─────────────────────────────────────────────────────┐
│  المرحلة 4: Authority Check (التحقق من الصلاحيات)  │
│  🔐 هل يملك حق الموافقة؟                           │
│  🔐 هل يستوفي الشروط؟                              │
└──────────────────┬──────────────────────────────────┘
                   │ إذا مصرح له ↓
┌─────────────────────────────────────────────────────┐
│  المرحلة 3: Controlled Execution (التنفيذ التلقائي)│
│  🔥 تنفيذ القرار مباشرة                            │
└──────────────────┬──────────────────────────────────┘
                   │ بعد التنفيذ ↓
┌─────────────────────────────────────────────────────┐
│  المرحلة 2: Executive Log (السجل القانوني)        │
│  📝 تسجيل الموافقة والتنفيذ                        │
└─────────────────────────────────────────────────────┘
```

---

## 📝 الدوال الجديدة

### Database Functions:
1. `can_approve_decision(decision_id, staff_id)` → jsonb
2. `get_decision_authorities(decision_type)` → TABLE
3. `add_decision_authority(...)` → jsonb
4. `remove_decision_authority(authority_id)` → jsonb
5. `get_all_decision_types_with_authorities()` → TABLE
6. `get_approvable_decisions(staff_id)` → TABLE

### React Hooks:
1. `useDecisionAuthorities()` - إدارة الصلاحيات

### React Components:
1. `DecisionAuthoritiesView` - واجهة الإدارة الكاملة
2. `AddAuthorityModal` - modal إضافة صلاحية

---

## 🚀 الاستخدام

### للمسؤول:
1. اذهب إلى `/admin/settings/authority`
2. اختر نوع القرار
3. انقر "إضافة صلاحية"
4. حدد الدور والشروط
5. احفظ

### للموظف:
- النظام يتحقق تلقائياً من الصلاحيات عند محاولة الموافقة
- لا يمكن الموافقة بدون صلاحية
- رسالة واضحة في حالة عدم وجود صلاحية

---

## ✅ الخلاصة

تم بناء نظام صلاحيات متكامل يضمن:
- **الأمان:** لا موافقة بدون صلاحية
- **المرونة:** دعم شروط مخصصة لكل حالة
- **الشفافية:** تسجيل كامل لكل محاولة
- **سهولة الإدارة:** واجهة بسيطة للتحكم

Build successful! النظام جاهز للاستخدام الكامل.
