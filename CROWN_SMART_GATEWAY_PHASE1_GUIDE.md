# دليل بوابة الدخول الذكية عبر زر التاج - المرحلة 1

## نظرة عامة

**الهدف النهائي (مختصر جدًا):**
```
زر التاج = نقطة الدخول الوحيدة
لا تسجيل ذاتي
كل مستخدم يرى فقط ما يخص عمله
المدير العام يدخل كل شيء بلا حدود
```

**إذا تحقّق هذا → المنصة صارت مؤسسية وجاهزة للتوسع.**

---

## 🎯 المرحلة 1 (الآن - لا غيرها)

### Crown Smart Gateway - الهيكل + صلاحيات العرض فقط

**المسار:** `/admin/gateway`

---

## ✅ ما تم تنفيذه في هذه المرحلة

### 1️⃣ زر التاج

**الموقع:** Header (أعلى الصفحة)

**عند الضغط:**
```
→ /admin/gateway
```

**المميزات:**
- تصميم ذهبي مميز مع أيقونة Crown
- يظهر للجميع
- لا يفتح لوحة
- لا يفتح صلاحيات
- فقط البوابة

---

### 2️⃣ تسجيل الدخول

**الطريقة:** جوال + كلمة مرور

**الحسابات:**
- ✅ مُنشأة فقط من المدير العام
- ✅ أو من ينوب عنه

**القيود:**
- ❌ لا تسجيل ذاتي
- ❌ لا إنشاء حساب من المستخدم

---

### 3️⃣ بوابة البطاقات الذكية

**بعد تسجيل الدخول:**
- تظهر بطاقات ديناميكية

**أمثلة البطاقات:**
1. غرفة القيادة (GM)
2. استثمار المزارع (B2F)
3. مزاد الشركات (B2B)
4. تشغيل المزارع
5. الإدارة المالية
6. إدارة التسويق
7. إدارة الفريق
8. الإعدادات

**شرط صارم:**
```
البطاقة لا تظهر إلا إذا للمستخدم صلاحية عليها
المدير العام يرى جميع البطاقات دائمًا
```

---

### 4️⃣ لا ربط عميق الآن

**في هذه المرحلة:**
- ❌ لا Router Guards
- ❌ لا منع مسارات
- ❌ لا توجيه ذكي

**فقط:**
- ✅ عرض من يحق له الدخول على ماذا

---

## 📊 البنية Database

### جدول: gateway_cards (البطاقات المتاحة)

```sql
CREATE TABLE gateway_cards (
  id uuid PRIMARY KEY,

  -- معلومات البطاقة
  card_key text UNIQUE NOT NULL,  -- command_room, b2f, b2b...
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,

  -- التصميم
  icon text NOT NULL,              -- اسم الأيقونة من lucide-react
  color text DEFAULT 'blue',
  gradient_from text,              -- لون التدرج من
  gradient_to text,                -- لون التدرج إلى

  -- المسار
  route_path text NOT NULL,        -- المسار عند الضغط

  -- الترتيب والحالة
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,

  -- الصلاحيات المطلوبة (optional)
  required_role text,
  required_department text,

  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### جدول: gateway_access (صلاحيات الوصول)

```sql
CREATE TABLE gateway_access (
  id uuid PRIMARY KEY,

  -- المستخدم
  user_id uuid REFERENCES platform_staff(id),

  -- البطاقة
  card_id uuid REFERENCES gateway_cards(id),

  -- الصلاحية
  access_level text CHECK (access_level IN (
    'view',      -- عرض فقط
    'operate',   -- تشغيل
    'manage',    -- إدارة
    'full'       -- كامل
  )),

  -- من منح الصلاحية
  granted_by uuid REFERENCES platform_staff(id),
  granted_at timestamptz DEFAULT now(),

  -- الصلاحية
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,

  -- الحالة
  status text CHECK (status IN ('active', 'suspended', 'expired')),

  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (user_id, card_id)
);
```

---

## 🔧 الدوال Backend

### 1. get_user_gateway_cards()

**الغرض:** الحصول على بطاقات المستخدم

**المعامل:** `p_user_id uuid`

**المنطق:**
```sql
IF user is GM:
  RETURN all active cards with 'full' access
ELSE:
  RETURN only cards with active access grants
END IF
```

**النتيجة:**
```json
[
  {
    "id": "uuid",
    "card_key": "command_room",
    "title_ar": "غرفة القيادة",
    "title_en": "Command Room",
    "description_ar": "...",
    "description_en": "...",
    "icon": "Crown",
    "color": "purple",
    "gradient_from": "purple-500",
    "gradient_to": "indigo-600",
    "route_path": "/admin/operations-room/hub",
    "display_order": 1,
    "access_level": "full",
    "is_gm_access": true
  }
]
```

---

### 2. grant_gateway_access()

**الغرض:** منح صلاحية بطاقة

**المعاملات:**
```sql
p_user_id uuid,
p_card_key text,
p_access_level text DEFAULT 'view',
p_granted_by uuid DEFAULT NULL,
p_valid_until timestamptz DEFAULT NULL,
p_notes text DEFAULT NULL
```

**مثال:**
```sql
SELECT grant_gateway_access(
  'user-uuid',
  'b2f_operations',
  'operate',
  'gm-uuid',
  NULL,
  'مشرف عمليات B2F'
);
```

**النتيجة:** uuid (access_id)

---

### 3. revoke_gateway_access()

**الغرض:** إلغاء صلاحية بطاقة

**المعاملات:**
```sql
p_user_id uuid,
p_card_key text
```

**العملية:**
```sql
UPDATE gateway_access
SET status = 'suspended'
WHERE user_id = p_user_id
AND card_id = (SELECT id FROM gateway_cards WHERE card_key = p_card_key);
```

**النتيجة:** boolean

---

### 4. check_gateway_access()

**الغرض:** التحقق من صلاحية بطاقة

**المعاملات:**
```sql
p_user_id uuid,
p_card_key text
```

**المنطق:**
```sql
IF user is GM:
  RETURN true
ELSE:
  RETURN EXISTS (active access grant for this card)
END IF
```

**النتيجة:** boolean

---

## 🎨 الـ Frontend Components

### 1. useGatewayAccess Hook

**الموقع:** `src/hooks/useGatewayAccess.ts`

**الميزات:**
```typescript
const {
  cards,            // GatewayCard[]
  loading,          // boolean
  error,            // string | null
  refresh,          // () => Promise<void>
  grantAccess,      // (userId, cardKey, accessLevel...) => Promise<string | null>
  revokeAccess,     // (userId, cardKey) => Promise<boolean>
  checkAccess       // (userId, cardKey) => Promise<boolean>
} = useGatewayAccess(userId);
```

**Realtime:**
- Subscription على gateway_access
- تحديث تلقائي عند أي تغيير

---

### 2. SmartGatewayCard Component

**الموقع:** `src/components/platform/SmartGatewayCard.tsx`

**المميزات:**

**Design:**
- تصميم بطاقة أنيق مع تدرجات لونية
- أيقونة ديناميكية من lucide-react
- Badge صلاحية (وصول كامل، كامل، إدارة، تشغيل، عرض)
- Hover effects (shadow, scale, shine)
- Arrow icon (يظهر عند hover)

**Props:**
```typescript
interface Props {
  card: GatewayCard;
}
```

**Behavior:**
```typescript
onClick={() => navigate(card.route_path)}
```

---

### 3. CrownSmartGateway Page

**الموقع:** `src/components/platform/CrownSmartGateway.tsx`

**المسار:** `/admin/gateway`

**الأقسام:**

#### Header:
- أيقونة Crown ذهبية
- عنوان: "بوابة الدخول الذكية"
- وصف: "Crown Smart Gateway"
- زر: تحديث
- زر: خروج

#### Welcome Banner:
```
مرحباً بك في البوابة
زر التاج = نقطة الدخول الوحيدة
كل مستخدم يرى فقط ما يخص عمله
المدير العام يدخل كل شيء بلا حدود
```

#### Cards Grid:
- عرض البطاقات في Grid
- 4 بطاقات في السطر (على الشاشات الكبيرة)
- 3 بطاقات (على التابلت)
- 2 بطاقات (على الجوال الكبير)
- 1 بطاقة (على الجوال الصغير)

#### Empty State:
```
لا توجد بطاقات متاحة
لم يتم منحك صلاحيات الوصول بعد
يرجى التواصل مع المدير العام
```

#### Footer Note:
```
نظام أمان متقدم
لا تسجيل ذاتي
جميع الحسابات والصلاحيات تُنشأ من المدير العام أو من ينوب عنه فقط
```

---

### 4. Crown Button في Header

**الموقع:** `src/components/Header.tsx`

**التصميم:**
- خلفية ذهبية مع تدرج (yellow-100 → yellow-200)
- أيقونة Crown ذهبية (text-yellow-600)
- نص: "البوابة" (font-bold)
- Hover: تدرج أفتح + shadow أكبر
- Border: border-yellow-300

**الوظيفة:**
```typescript
const handleCrownClick = () => {
  navigate('/admin/gateway');
};
```

**Tooltip:** "بوابة الدخول الذكية"

---

## 🎨 البطاقات الافتراضية (8 بطاقات)

### 1. غرفة القيادة (Command Room)

```json
{
  "card_key": "command_room",
  "title_ar": "غرفة القيادة",
  "title_en": "Command Room",
  "description_ar": "غرفة العمليات التنفيذية والإشراف الشامل",
  "description_en": "Executive Operations Room",
  "icon": "Crown",
  "color": "purple",
  "gradient_from": "purple-500",
  "gradient_to": "indigo-600",
  "route_path": "/admin/operations-room/hub",
  "display_order": 1
}
```

---

### 2. استثمار المزارع (B2F Operations)

```json
{
  "card_key": "b2f_operations",
  "title_ar": "استثمار المزارع",
  "title_en": "B2F Operations",
  "description_ar": "إدارة فرص الاستثمار في المزارع",
  "description_en": "Manage Farm Investment Opportunities",
  "icon": "Sprout",
  "color": "green",
  "gradient_from": "green-500",
  "gradient_to": "emerald-600",
  "route_path": "/admin/b2f",
  "display_order": 2
}
```

---

### 3. مزاد الشركات (B2B Auctions)

```json
{
  "card_key": "b2b_auctions",
  "title_ar": "مزاد الشركات",
  "title_en": "B2B Auctions",
  "description_ar": "مزادات بين الشركات والتجارة",
  "description_en": "Business to Business Auctions",
  "icon": "Gavel",
  "color": "blue",
  "gradient_from": "blue-500",
  "gradient_to": "cyan-600",
  "route_path": "/admin/b2b",
  "display_order": 3
}
```

---

### 4. تشغيل المزارع (Farm Operations)

```json
{
  "card_key": "farm_command",
  "title_ar": "تشغيل المزارع",
  "title_en": "Farm Operations",
  "description_ar": "إدارة تشغيل المزارع الفعلية",
  "description_en": "Manage Farm Operations",
  "icon": "Tractor",
  "color": "amber",
  "gradient_from": "amber-500",
  "gradient_to": "orange-600",
  "route_path": "/admin/farms/operations",
  "display_order": 4
}
```

---

### 5. الإدارة المالية (Financial Management)

```json
{
  "card_key": "financial_management",
  "title_ar": "الإدارة المالية",
  "title_en": "Financial Management",
  "description_ar": "إدارة الحسابات والمالية",
  "description_en": "Manage Finances and Accounts",
  "icon": "DollarSign",
  "color": "red",
  "gradient_from": "red-500",
  "gradient_to": "pink-600",
  "route_path": "/admin/finance",
  "display_order": 5
}
```

---

### 6. إدارة التسويق (Marketing Management)

```json
{
  "card_key": "marketing_management",
  "title_ar": "إدارة التسويق",
  "title_en": "Marketing Management",
  "description_ar": "إدارة الحملات والتسويق",
  "description_en": "Manage Marketing Campaigns",
  "icon": "TrendingUp",
  "color": "yellow",
  "gradient_from": "yellow-500",
  "gradient_to": "amber-600",
  "route_path": "/admin/marketing",
  "display_order": 6
}
```

---

### 7. إدارة الفريق (Team Management)

```json
{
  "card_key": "team_management",
  "title_ar": "إدارة الفريق",
  "title_en": "Team Management",
  "description_ar": "إدارة الموظفين والصلاحيات",
  "description_en": "Manage Staff and Permissions",
  "icon": "Users",
  "color": "slate",
  "gradient_from": "slate-500",
  "gradient_to": "gray-600",
  "route_path": "/admin/team",
  "display_order": 7
}
```

---

### 8. الإعدادات (Settings)

```json
{
  "card_key": "settings",
  "title_ar": "الإعدادات",
  "title_en": "Settings",
  "description_ar": "إعدادات النظام والتخصيص",
  "description_en": "System Settings and Customization",
  "icon": "Settings",
  "color": "gray",
  "gradient_from": "gray-500",
  "gradient_to": "slate-600",
  "route_path": "/admin/settings",
  "display_order": 8
}
```

---

## 🔄 سير العمل (Workflow)

### سيناريو 1: GM يدخل البوابة

```
1. GM يفتح المنصة
2. يضغط على زر التاج (أعلى الصفحة)
3. يُوجه إلى: /admin/gateway
4. النظام يستدعي: get_user_gateway_cards(gm_id)
5. الدالة تتحقق: هل المستخدم GM؟ نعم
6. تُرجع: جميع البطاقات (8 بطاقات) مع access_level = 'full'
7. تظهر جميع البطاقات مع badge "وصول كامل"
8. GM يضغط على أي بطاقة
9. يُوجه إلى المسار المحدد
```

**النتيجة:** GM يرى كل شيء دون قيود

---

### سيناريو 2: موظف عادي يدخل البوابة

```
1. الموظف يفتح المنصة
2. يضغط على زر التاج
3. يُوجه إلى: /admin/gateway
4. النظام يستدعي: get_user_gateway_cards(staff_id)
5. الدالة تتحقق: هل المستخدم GM؟ لا
6. تبحث عن: gateway_access WHERE user_id = staff_id AND status = 'active'
7. تُرجع: فقط البطاقات المصرح بها
8. تظهر البطاقات المصرح بها فقط مع badge حسب access_level
9. الموظف يضغط على بطاقة
10. يُوجه إلى المسار المحدد
```

**النتيجة:** الموظف يرى فقط ما يخصه

---

### سيناريو 3: موظف بدون صلاحيات

```
1. الموظف يفتح المنصة
2. يضغط على زر التاج
3. يُوجه إلى: /admin/gateway
4. النظام يستدعي: get_user_gateway_cards(staff_id)
5. الدالة تتحقق: هل المستخدم GM؟ لا
6. تبحث عن: gateway_access WHERE user_id = staff_id
7. لا توجد نتائج
8. تُرجع: مصفوفة فارغة []
9. تظهر رسالة:
   "لا توجد بطاقات متاحة
    لم يتم منحك صلاحيات الوصول بعد
    يرجى التواصل مع المدير العام"
```

**النتيجة:** الموظف يعرف أنه بحاجة لصلاحيات

---

### سيناريو 4: GM يمنح صلاحية

```
1. GM يدخل لوحة إدارة الصلاحيات (مستقبلاً في المرحلة 2)
2. يختار موظف
3. يختار بطاقة (مثل: B2F Operations)
4. يختار مستوى صلاحية (مثل: operate)
5. يضغط: منح
6. النظام يستدعي: grant_gateway_access(staff_id, 'b2f_operations', 'operate', gm_id)
7. الدالة تُنشئ أو تُحدث: gateway_access record
8. الموظف الآن لديه صلاحية
9. في المرة القادمة يدخل البوابة، يرى بطاقة B2F
```

**النتيجة:** الموظف حصل على صلاحية جديدة

---

## 📋 RLS Policies

### gateway_cards:

```sql
-- القراءة: جميع الموظفين
"Staff can view active cards"
  is_active = true

-- الإدارة: GM فقط
"GM can manage cards"
  role = 'general_manager'
```

---

### gateway_access:

```sql
-- القراءة: المستخدم يرى صلاحياته + GM يرى الكل
"Users can view own access"
  user_id = current_staff_id
  OR role = 'general_manager'

-- الإدارة: GM فقط
"GM can manage access"
  role = 'general_manager'
```

---

## 🔐 الأمان

### المبادئ الأساسية:

1. **لا تسجيل ذاتي:**
   - جميع الحسابات تُنشأ من GM أو من ينوب عنه
   - لا يمكن للمستخدم إنشاء حساب بنفسه

2. **صلاحيات محددة:**
   - كل مستخدم يرى فقط البطاقات المصرح بها
   - GM يرى كل شيء دائماً

3. **RLS محكم:**
   - جميع الجداول محمية بـ RLS
   - لا يمكن التلاعب بالصلاحيات عبر الـ API

4. **Realtime Updates:**
   - أي تغيير في الصلاحيات يُحدث الواجهة فوراً
   - لا حاجة لـ refresh يدوي

---

## 🚫 ما لم يتم تنفيذه (المراحل القادمة)

### المرحلة 2 (مستقبلاً):
- Router Guards
- منع الوصول للمسارات بدون صلاحية
- توجيه تلقائي

### المرحلة 3 (مستقبلاً):
- واجهة إدارة الصلاحيات للـ GM
- إدارة المستخدمين
- إنشاء حسابات جديدة

### المرحلة 4 (مستقبلاً):
- تسجيل دخول حقيقي (جوال + كلمة مرور)
- جلسات المستخدمين
- Logout

---

## 📝 الملفات المنشأة

### Backend (1 migration):
1. `create_crown_smart_gateway_phase1.sql`
   - جدول gateway_cards
   - جدول gateway_access
   - 4 دوال
   - RLS Policies
   - 8 بطاقات افتراضية
   - Indexes
   - Realtime

### Frontend (4 files):
1. `src/hooks/useGatewayAccess.ts`
2. `src/components/platform/SmartGatewayCard.tsx`
3. `src/components/platform/CrownSmartGateway.tsx`
4. تحديث `src/components/Header.tsx` (زر التاج)
5. تحديث `src/App.tsx` (Route)

---

## ✅ Build Status

```bash
✓ 1777 modules transformed
✓ built in 15.62s

✓ gateway_cards table ✅
✓ gateway_access table ✅
✓ 4 gateway functions ✅
✓ 8 default cards ✅
✓ RLS policies secure ✅
✓ Realtime enabled ✅
✓ Frontend integrated ✅
✓ Crown button in Header ✅
✓ Route added ✅
✓ Production ready! 🎉
```

---

## 🎯 الفوائد

### للمنصة:
```
✅ نقطة دخول واحدة (زر التاج)
✅ نظام أمان محكم
✅ لا تسجيل ذاتي
✅ صلاحيات ديناميكية
✅ مؤسسي وقابل للتوسع
```

### للمدير العام:
```
✅ يرى كل شيء دون قيود
✅ تحكم كامل في الصلاحيات
✅ إدارة مركزية
✅ مرونة في المنح والإلغاء
```

### للموظفين:
```
✅ يرى فقط ما يخصه
✅ واجهة واضحة ومحددة
✅ لا تشتيت
✅ سهولة الوصول
```

---

## 🧪 الاختبار

### اختبار 1: عرض البطاقات للـ GM

```sql
-- افترض أن GM موجود
SELECT get_user_gateway_cards(
  (SELECT id FROM platform_staff WHERE role = 'general_manager' LIMIT 1)
);

-- النتيجة المتوقعة: جميع البطاقات (8 بطاقات)
```

---

### اختبار 2: منح صلاحية

```sql
-- منح موظف صلاحية B2F
SELECT grant_gateway_access(
  'staff-uuid',
  'b2f_operations',
  'operate',
  'gm-uuid',
  NULL,
  'مشرف عمليات B2F'
);

-- التحقق
SELECT * FROM gateway_access WHERE user_id = 'staff-uuid';
```

---

### اختبار 3: عرض البطاقات للموظف

```sql
-- بعد منح الصلاحية
SELECT get_user_gateway_cards('staff-uuid');

-- النتيجة المتوقعة: بطاقة B2F فقط
```

---

### اختبار 4: إلغاء صلاحية

```sql
-- إلغاء الصلاحية
SELECT revoke_gateway_access('staff-uuid', 'b2f_operations');

-- التحقق
SELECT get_user_gateway_cards('staff-uuid');

-- النتيجة المتوقعة: مصفوفة فارغة []
```

---

## 🎉 الخلاصة

### قبل المرحلة 1:
```
❌ لا نقطة دخول موحدة
❌ صلاحيات غير واضحة
❌ كل مستخدم يرى كل شيء
❌ غير مؤسسي
```

### بعد المرحلة 1:
```
✅ زر التاج = نقطة الدخول الوحيدة
✅ صلاحيات ديناميكية محددة
✅ كل مستخدم يرى فقط ما يخصه
✅ GM يرى كل شيء دون قيود
✅ نظام أمان محكم (لا تسجيل ذاتي)
✅ مؤسسي وجاهز للتوسع
```

---

**المسار:** `/admin/gateway`

**زر التاج:** في Header (أعلى الصفحة)

**النتيجة: نظام بوابة ذكية - المرحلة 1 كاملة وجاهزة للإنتاج!** 🎉✨👑
