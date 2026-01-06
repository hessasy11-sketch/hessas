# دليل المدير العام السريع
# General Manager Quick Reference

**نظام البوابة الذكية - Crown Smart Gateway System**

---

## نقاط الدخول الرئيسية | Main Entry Points

### 1. 🚪 بوابة الدخول | Gateway
**المسار | Path**: `/admin/gateway`

- نقطة الدخول الوحيدة لجميع المستخدمين
- Single entry point for all users
- تسجيل الدخول بالهاتف وكلمة المرور
- Login with phone + password

### 2. 👥 إدارة الموظفين | Staff Management
**المسار | Path**: `/admin/settings/staff`

- إنشاء حسابات الموظفين الجدد
- Create new staff accounts
- إيقاف وتفعيل الحسابات
- Suspend/activate accounts
- إعادة تعيين كلمات المرور
- Reset passwords

### 3. 👁️ لوحة التحكم والمراقبة | GM Control & Monitoring
**المسار | Path**: `/admin/settings/gm-control`

- وضع المراقبة (View-As)
- View any staff's interface
- السجلات التنفيذية
- Executive logs
- الجلسات النشطة
- Active monitoring sessions

---

## سير العمل السريع | Quick Workflows

### إنشاء موظف جديد | Create New Staff

```
1. اذهب إلى → Go to: /admin/settings/staff
2. اضغط "إضافة موظف جديد" → Click "Add New Employee"
3. املأ البيانات → Fill form:
   - الاسم (عربي) | Name (Arabic)
   - رقم الهاتف | Phone (05xxxxxxxx)
   - الدور | Role
   - القسم | Department
4. اضغط "إنشاء الحساب" → Click "Create Account"
5. ⚠️ انسخ كلمة المرور المؤقتة فوراً
   Copy temporary password immediately!
6. أعط الموظف: الهاتف + كلمة المرور
   Give employee: phone + password
```

**ملاحظة هامة**: كلمة المرور تظهر مرة واحدة فقط!
**Important**: Password shown only once!

---

### مراقبة موظف (View-As) | Monitor Staff

```
1. اذهب إلى → Go to: /admin/settings/gm-control
2. ابحث عن الموظف → Search for staff
3. اضغط "عرض كـ" → Click "View As"
4. ✅ سترى البانر البرتقالي في الأعلى
   Orange banner appears at top
5. الآن أنت ترى ما يراه الموظف
   You see what staff member sees
6. لإنهاء: اضغط "إنهاء المراقبة"
   To stop: Click "Stop Monitoring"
```

**فائدة**: التأكد من أن الموظف يرى الصلاحيات الصحيحة
**Benefit**: Verify staff sees correct permissions

---

### إيقاف حساب موظف | Suspend Staff Account

```
1. اذهب إلى → Go to: /admin/settings/staff
2. ابحث عن الموظف → Search for staff
3. اضغط القائمة ⋮ → Click menu ⋮
4. اختر "إيقاف الحساب" → Select "Suspend Account"
5. اكتب السبب (اختياري) → Enter reason (optional)
6. أكد الإيقاف → Confirm suspension
```

**نتيجة**: الموظف لا يستطيع تسجيل الدخول فوراً
**Result**: Staff cannot login immediately

---

### إعادة تعيين كلمة المرور | Reset Password

```
1. اذهب إلى → Go to: /admin/settings/staff
2. ابحث عن الموظف → Search for staff
3. اضغط القائمة ⋮ → Click menu ⋮
4. اختر "إعادة تعيين كلمة المرور"
   Select "Reset Password"
5. ⚠️ انسخ كلمة المرور الجديدة فوراً
   Copy new password immediately!
6. أعط الموظف كلمة المرور الجديدة
   Give employee the new password
```

**ملاحظة**: كلمة المرور القديمة تتوقف فوراً
**Note**: Old password stops working immediately

---

## صلاحياتك المطلقة | Your Absolute Powers

### ✅ يمكنك | You Can:

1. **الدخول لأي شيء بدون قيود**
   - Access anything without restrictions
   - تجاوز جميع الحراس والقيود
   - Bypass all guards and limits

2. **إنشاء وحذف حسابات الموظفين**
   - Create and delete staff accounts
   - أنت الوحيد الذي يستطيع إنشاء الحسابات
   - Only you can create accounts

3. **مراقبة أي موظف (View-As)**
   - Monitor any staff member
   - رؤية واجهته بالضبط
   - See their exact interface

4. **إيقاف أي حساب فوراً**
   - Suspend any account instantly
   - بدون موافقة أحد
   - Without anyone's approval

5. **تفعيل الحسابات الموقوفة**
   - Reactivate suspended accounts
   - في أي وقت
   - Anytime

6. **إعادة تعيين أي كلمة مرور**
   - Reset any password
   - كلمة مرور جديدة عشوائية آمنة
   - New secure random password

7. **رؤية جميع السجلات والأنشطة**
   - View all logs and activities
   - سجلات تفصيلية لكل عملية
   - Detailed logs of all operations

---

## معلومات الأمان | Security Information

### كلمات المرور | Passwords

- **الطول**: 8 أحرف | **Length**: 8 characters
- **النوع**: حروف كبيرة وأرقام | **Type**: Uppercase + numbers
- **التشفير**: Bcrypt (آمن جداً) | **Encryption**: Bcrypt (very secure)
- **مثال**: `A3F9K2M7`

### نظام الصلاحيات | Permission System

```
المدير العام (أنت)    → كل شيء بلا حدود
General Manager (You)  → Everything unlimited

مدير قسم             → فقط قسمه
Department Manager    → Only their department

موظف عادي            → فقط عمله
Regular Staff         → Only their work
```

### التسجيل والتتبع | Logging & Tracking

- **كل عملية تسجل تلقائياً**
  Every operation logged automatically

- **لا يمكن حذف السجلات**
  Logs cannot be deleted

- **السجلات تشمل**: التوقيت، المستخدم، الإجراء، السبب
  **Logs include**: Time, user, action, reason

---

## الأسئلة الشائعة | FAQ

### س: موظف نسي كلمة المرور
**Q: Staff forgot password**

```
حل → Solution:
1. اذهب لإدارة الموظفين
   Go to Staff Management
2. إعادة تعيين كلمة المرور
   Reset password
3. أعطه كلمة المرور الجديدة
   Give them new password
```

---

### س: كيف أتأكد من صلاحيات موظف؟
**Q: How to verify staff permissions?**

```
حل → Solution:
استخدم "View-As" في لوحة التحكم
Use "View-As" in GM Control Panel
- سترى واجهته بالضبط
  You'll see their exact interface
- لن تؤثر على جلستك
  Won't affect your session
```

---

### س: موظف يرى أشياء لا يجب أن يراها
**Q: Staff sees things they shouldn't**

```
حل → Solution:
1. أوقف حسابه فوراً
   Suspend account immediately
2. راجع صلاحياته في النظام
   Review their permissions
3. عدل دوره أو قسمه
   Edit their role or department
4. فعّل الحساب مرة أخرى
   Reactivate account
```

---

### س: هل يمكن للموظف تغيير كلمة مروره؟
**Q: Can staff change their password?**

```
حالياً: لا
Currently: No
- فقط المدير العام يستطيع إعادة تعيين كلمات المرور
  Only GM can reset passwords
- (سيتم إضافة خاصية تغيير كلمة المرور الذاتية في المرحلة 6)
  (Self-password change in Phase 6)
```

---

### س: كيف أحذف حساب موظف؟
**Q: How to delete staff account?**

```
حالياً: يدوياً من قاعدة البيانات
Currently: Manually from database

SQL:
DELETE FROM platform_staff WHERE id = 'staff-id';

(سيتم إضافة زر حذف في واجهة الإدارة قريباً)
(Delete button in UI coming soon)
```

---

## لوحة المعلومات | Dashboard Statistics

في `/admin/settings/staff` ترى:
In `/admin/settings/staff` you see:

```
┌─────────────────────────────────────────┐
│ 📊 إحصائيات | Statistics              │
├─────────────────────────────────────────┤
│ إجمالي الموظفين    | Total Staff: 45  │
│ الحسابات النشطة    | Active: 42       │
│ الحسابات الموقوفة  | Suspended: 3     │
└─────────────────────────────────────────┘
```

---

## البحث والفلترة | Search & Filter

البحث يعمل على:
Search works on:

- ✅ الاسم | Name
- ✅ رقم الهاتف | Phone
- ✅ الدور | Role
- ✅ القسم | Department

**مثال**: ابحث عن "محمد" أو "0501" أو "manager"
**Example**: Search "محمد" or "0501" or "manager"

---

## حالات الحساب | Account Statuses

### 🟢 نشط | Active
- يستطيع تسجيل الدخول
- Can login
- يستطيع العمل
- Can work

### 🔴 موقوف | Suspended
- لا يستطيع تسجيل الدخول
- Cannot login
- جميع الجلسات النشطة تتوقف فوراً
- All active sessions stop immediately

---

## تذكيرات هامة | Important Reminders

### ⚠️ عند إنشاء موظف
**When Creating Staff**

1. انسخ كلمة المرور فوراً
   Copy password immediately
2. لن تظهر مرة أخرى
   Won't show again
3. أرسلها للموظف بطريقة آمنة
   Send to staff securely

### 🔒 عند إيقاف حساب
**When Suspending Account**

- التأثير فوري (خلال ثواني)
  Effect is immediate (seconds)
- الموظف يُطرد من جميع الجلسات
  Staff kicked from all sessions
- يمكنك تفعيله مرة أخرى في أي وقت
  You can reactivate anytime

### 👁️ عند استخدام View-As
**When Using View-As**

- جلستك الأصلية آمنة
  Your real session is safe
- البانر البرتقالي يظهر دائماً
  Orange banner always visible
- المؤقت يعمل تلقائياً
  Timer runs automatically
- جميع الأنشطة مسجلة
  All activity logged

---

## أرقام الدعم | Support Numbers

**للدعم التقني | Technical Support**:
- لا يوجد حالياً - أنت المدير العام!
- N/A - You're the General Manager!

**للمشاكل الحرجة | Critical Issues**:
1. راجع السجلات في `/admin/settings/gm-control`
   Check logs in `/admin/settings/gm-control`
2. راجع قاعدة البيانات مباشرة
   Check database directly
3. راجع الوثائق التقنية
   Review technical docs

---

## المراحل القادمة | Upcoming Phases

### 🔜 قريباً | Coming Soon

- **المرحلة 6**: تغيير كلمة المرور الذاتية
  **Phase 6**: Self password change

- **المرحلة 7**: المصادقة الثنائية (2FA)
  **Phase 7**: Two-factor authentication

- **المرحلة 8**: تواريخ انتهاء الحسابات
  **Phase 8**: Account expiration dates

- **المرحلة 9**: الاستيراد والتصدير الجماعي
  **Phase 9**: Bulk import/export

---

## الملفات المرجعية | Reference Files

- `PHASE_4_5_VERIFICATION.md` - دليل الاختبار الكامل
  Complete testing guide

- `STAFF_PROVISIONING_PHASE5.md` - الوثائق التقنية التفصيلية
  Detailed technical docs

- `CROWN_GATEWAY_PHASE1_GUIDE.md` - دليل نظام البوابة
  Gateway system guide

---

**تاريخ الإصدار | Version Date**: 2026-01-06
**الحالة | Status**: ✅ نظام كامل وجاهز | Complete & Ready
**البناء | Build**: 1790 وحدة، 19.25 ثانية | 1790 modules, 19.25s

---

## اتصال سريع | Quick Links

```
بوابة الدخول        | Gateway:           /admin/gateway
إدارة الموظفين      | Staff Mgmt:        /admin/settings/staff
لوحة التحكم         | GM Control:        /admin/settings/gm-control
عملي (موظف)        | My Work (Staff):   /admin/my-work
```

---

**🎯 نصيحة أخيرة | Final Tip**

استخدم View-As بانتظام للتأكد من أن كل موظف يرى فقط ما يجب أن يراه.
Use View-As regularly to ensure each staff member sees only what they should see.

**الصلاحية الشاملة تعني المسؤولية الشاملة.**
**Absolute access means absolute responsibility.**
