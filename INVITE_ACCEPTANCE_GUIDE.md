# دليل قبول الدعوات الإدارية - Invite Acceptance System

## المرحلة 3: قبول الدعوة وتفعيل الحساب

### نظرة عامة
نظام متكامل يسمح للموظفين المدعوين بقبول دعواتهم وتفعيل حساباتهم تلقائياً مع الحصول على جميع الصلاحيات المخصصة.

---

## 🎯 الهدف
الموظف يدخل بكود الدعوة ويتفعل حسابه تلقائياً ويأخذ صلاحياته المحددة.

---

## 📍 المسار
```
/admin/invite
```

---

## 🔧 المكونات التقنية

### 1. قاعدة البيانات

#### الدوال الجديدة:

**`verify_invitation_code(p_invite_code, p_phone)`**
- التحقق من صحة كود الدعوة
- التحقق من رقم الجوال
- التحقق من حالة الدعوة (invited, accepted, cancelled)
- التحقق من تاريخ الانتهاء
- إرجاع معلومات الدعوة إذا كانت صالحة

**`accept_authority_invitation(p_invite_code, p_phone, p_pin_code)`**
- قبول الدعوة وتفعيل الحساب
- إنشاء/تحديث الموظف في `platform_staff`
- تعيين الدور والصلاحيات
- توليد QR Code فريد
- تعيين PIN (اختياري)
- إنشاء Session جديدة
- تحديث حالة الدعوة إلى `accepted`
- تسجيل في Audit Logs
- تحديد المسار حسب النطاق والدور

---

## 💻 واجهة المستخدم

### صفحة `/admin/invite`

#### المرحلة 1: إدخال البيانات
```
┌─────────────────────────────────────┐
│    🎯 قبول الدعوة الإدارية         │
├─────────────────────────────────────┤
│                                     │
│  📧 كود الدعوة (8 أحرف/أرقام)     │
│  ┌───────────────────────────────┐  │
│  │       XXXXXXXX                │  │
│  └───────────────────────────────┘  │
│                                     │
│  📱 رقم الجوال                     │
│  ┌───────────────────────────────┐  │
│  │       05xxxxxxxx              │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   ✓ التحقق من الدعوة         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### المرحلة 2: عرض معلومات الدعوة
```
┌─────────────────────────────────────┐
│  👤 مرحباً: أحمد محمد               │
├─────────────────────────────────────┤
│                                     │
│  الدور: FARM_MANAGER               │
│  النطاق: مزرعة محددة               │
│                                     │
│  🔐 رمز PIN (اختياري)              │
│  ┌───────────────────────────────┐  │
│  │       ****                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  📋 ماذا سيحدث بعد الموافقة؟      │
│  • تفعيل الحساب تلقائياً          │
│  • الحصول على جميع الصلاحيات      │
│  • إنشاء QR Code خاص              │
│  • التوجيه إلى لوحة التحكم        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   👑 قبول وتفعيل الحساب      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### المرحلة 3: النجاح والتوجيه
```
┌─────────────────────────────────────┐
│         ✓ مرحباً بك!               │
├─────────────────────────────────────┤
│                                     │
│  تم قبول الدعوة وتفعيل حسابك      │
│         بنجاح!                     │
│                                     │
│  ⏳ جاري التوجيه إلى لوحة التحكم  │
│                                     │
│  المسار: /admin/operations-room/b2f│
│                                     │
│  ✨ تم تفعيل حسابك بنجاح           │
└─────────────────────────────────────┘
```

---

## 🔀 منطق التوجيه (Routing Logic)

```typescript
// التوجيه حسب النطاق (Scope)
if (scope_type === 'platform' || role === 'GM') {
  → /admin/operations-room
}
else if (scope_type === 'b2f' || scope_type === 'farm') {
  → /admin/operations-room/b2f
}
else if (scope_type === 'b2b') {
  → /admin/operations-room/b2b
}
```

### أمثلة على التوجيه:

| الدور | النطاق | المسار النهائي |
|------|--------|----------------|
| GM | platform | `/admin/operations-room` |
| FARM_MANAGER | farm | `/admin/operations-room/b2f` |
| B2F_ASSISTANT | b2f | `/admin/operations-room/b2f` |
| B2B_ASSISTANT | b2b | `/admin/operations-room/b2b` |
| FINANCE_MANAGER | platform | `/admin/operations-room` |

---

## 🔐 الأمان والتحققات

### التحققات التلقائية:
1. ✅ كود الدعوة صحيح ومطابق في النظام
2. ✅ رقم الجوال مطابق للمسجل في الدعوة
3. ✅ الدعوة في حالة `invited` (لم يتم قبولها مسبقاً)
4. ✅ الدعوة غير ملغاة
5. ✅ الدعوة لم تنته صلاحيتها
6. ✅ الدور موجود في الكتالوج

### الإجراءات الأمنية:
- 🔒 تشفير PIN code باستخدام bcrypt
- 🔒 توليد QR code فريد لكل موظف
- 🔒 تسجيل جميع العمليات في Audit Logs
- 🔒 إنشاء Session آمنة ومشفرة

---

## 📝 سير العمل الكامل

### 1. المدير العام يرسل الدعوة
```sql
-- في Authority Panel
CREATE INVITATION:
  - Name: أحمد محمد
  - Phone: 0512345678
  - Role: FARM_MANAGER
  - Scope: farm (مزرعة الرياض)
  - Expiry: 30 days

RESULT: invite_code = "A7B9C2D4"
```

### 2. الموظف يستلم الكود
```
📱 رسالة نصية أو واتساب:
"مرحباً أحمد محمد،
تم دعوتك للانضمام لفريق العمل كمدير مزرعة.
كود الدعوة: A7B9C2D4
افتح: https://platform.com/admin/invite"
```

### 3. الموظف يقبل الدعوة
```
1. يفتح /admin/invite
2. يدخل: A7B9C2D4
3. يدخل: 0512345678
4. يضغط "التحقق"
5. يظهر: "مرحباً أحمد محمد - دورك: مدير مزرعة"
6. (اختياري) يدخل PIN: 1234
7. يضغط "قبول وتفعيل"
8. يتم توجيهه إلى: /admin/operations-room/b2f
```

### 4. النتيجة النهائية
```sql
-- في platform_staff
INSERT: {
  staff_code: "STF-000123",
  name: "أحمد محمد",
  phone: "0512345678",
  role: "FARM_MANAGER",
  department: "b2f",
  qr_code: "QR-A1B2C3D4E5F6",
  pin_code: [encrypted],
  status: "active"
}

-- في authority_invitations
UPDATE: {
  status: "accepted",
  accepted_at: "2026-01-05 12:30:00",
  accepted_by_staff_id: [staff_id]
}

-- في platform_staff_sessions
INSERT: {
  staff_id: [staff_id],
  login_method: "invitation_acceptance",
  landing_route: "/admin/operations-room/b2f",
  is_active: true
}
```

---

## 🧪 اختبار القبول

### السيناريو 1: دعوة Farm Manager
```bash
# 1. إنشاء الدعوة
POST /rpc/create_authority_invitation
{
  "invitee_name": "أحمد محمد",
  "invitee_phone": "0512345678",
  "authority_role": "FARM_MANAGER",
  "scope_type": "farm",
  "scope_farm_id": "uuid-farm-001"
}
→ invite_code: "A7B9C2D4"

# 2. قبول الدعوة
GET /admin/invite
- إدخال: A7B9C2D4
- إدخال: 0512345678
- قبول
→ التوجيه: /admin/operations-room/b2f

# 3. التحقق
SELECT * FROM platform_staff WHERE phone = '0512345678'
→ role: FARM_MANAGER, status: active

SELECT * FROM authority_invitations WHERE invite_code = 'A7B9C2D4'
→ status: accepted
```

### السيناريو 2: دعوة B2B Assistant
```bash
# 1. إنشاء الدعوة
POST /rpc/create_authority_invitation
{
  "invitee_name": "سارة خالد",
  "invitee_phone": "0598765432",
  "authority_role": "B2B_ASSISTANT",
  "scope_type": "b2b"
}
→ invite_code: "X9Y8Z7W6"

# 2. قبول الدعوة
GET /admin/invite
- إدخال: X9Y8Z7W6
- إدخال: 0598765432
- قبول
→ التوجيه: /admin/operations-room/b2b

# 3. التحقق
SELECT * FROM platform_staff WHERE phone = '0598765432'
→ role: B2B_ASSISTANT, department: b2b
```

---

## ⚠️ معالجة الأخطاء

### أخطاء محتملة ورسائلها:

| الخطأ | الرسالة | الحل |
|------|---------|------|
| كود خاطئ | "كود الدعوة غير صحيح" | تأكد من الكود |
| جوال خاطئ | "رقم الجوال غير مطابق للدعوة" | استخدم الرقم المسجل |
| مقبولة مسبقاً | "تم قبول هذه الدعوة مسبقاً" | اتصل بالإدارة |
| ملغاة | "تم إلغاء هذه الدعوة" | اطلب دعوة جديدة |
| منتهية | "انتهت صلاحية هذه الدعوة" | اطلب دعوة جديدة |

---

## 📊 الإحصائيات والتتبع

### Audit Logs
يتم تسجيل:
- `invitation_accepted` - وقت قبول الدعوة
- `staff_created` - إنشاء حساب جديد
- `session_created` - إنشاء جلسة جديدة
- `role_assigned` - تعيين الدور

### التقارير
```sql
-- عدد الدعوات المقبولة اليوم
SELECT COUNT(*) FROM authority_invitations
WHERE status = 'accepted'
AND accepted_at::date = CURRENT_DATE;

-- متوسط وقت قبول الدعوة
SELECT AVG(accepted_at - invited_at) as avg_acceptance_time
FROM authority_invitations
WHERE status = 'accepted';

-- الدعوات حسب النطاق
SELECT scope_type, COUNT(*)
FROM authority_invitations
WHERE status = 'accepted'
GROUP BY scope_type;
```

---

## 🎨 الميزات البصرية

### التصميم:
- 🎨 تدرجات لونية حديثة (Gradient backgrounds)
- ✨ أنيميشن عند النجاح (bounce animation)
- 🔄 مؤشر تحميل أثناء المعالجة
- 📱 تصميم متجاوب للجوال
- 🎯 أيقونات توضيحية لكل خطوة
- 💎 ظلال وتأثيرات ثلاثية الأبعاد

### الألوان حسب النطاق:
- Platform: أزرق 🔵
- B2F: أخضر 🟢
- B2B: أزرق غامق 🔷
- Farm: أخضر داكن 🟩

---

## 🚀 الخطوات التالية

بعد قبول الدعوة، يمكن للموظف:
1. ✅ الدخول عبر QR Code
2. ✅ الدخول عبر PIN Code
3. ✅ الوصول إلى لوحة التحكم الخاصة
4. ✅ استخدام جميع الصلاحيات المخصصة
5. ✅ البدء بالعمل فوراً

---

## 📞 الدعم الفني

للمساعدة:
- مشاكل في قبول الدعوة → الاتصال بالمدير العام
- مشاكل تقنية → فريق الدعم الفني
- استفسارات حول الصلاحيات → قسم الموارد البشرية

---

## ✅ معايير النجاح

- [x] التحقق من كود الدعوة يعمل
- [x] التحقق من رقم الجوال يعمل
- [x] إنشاء/تحديث الموظف يعمل
- [x] تعيين الصلاحيات يعمل
- [x] توليد QR Code يعمل
- [x] إنشاء Session يعمل
- [x] التوجيه حسب النطاق يعمل
- [x] تسجيل Audit Logs يعمل
- [x] معالجة الأخطاء تعمل
- [x] واجهة المستخدم جذابة وسهلة

---

**تم التنفيذ بنجاح - 2026-01-05** ✓
