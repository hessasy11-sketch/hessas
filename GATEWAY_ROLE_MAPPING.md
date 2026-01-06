# قَسْمَة بطاقات البوابة على الأدوار
## Gateway Card to Role Mapping

---

## 🎯 الهدف

تحديد **من يرى كل بطاقة** في بوابة التاج حسب دوره (ظهور فقط، لا صلاحيات تنفيذ عميقة).

**ملاحظات مهمة:**
- هذه القَسْمَة تتحكم فقط في **رؤية البطاقة** في البوابة
- صلاحيات التنفيذ داخل كل قسم **تُنظم لاحقاً بواسطة Guards منفصلة**
- المدير العام (GM) له **Bypass كامل** دائماً على جميع البطاقات

---

## 📊 جدول القَسْمَة الرسمي

| # | البطاقة | من يراها | المسار | ملاحظة |
|---|---------|----------|--------|---------|
| 1 | **غرفة القيادة العليا** | GM فقط | `/admin/operations-room/global` | Bypass كامل - البطاقة الأقوى |
| 2 | **غرفة استثمار أشجار المزارع (B2F)** | GM، مساعد B2F، مدير المزارع الوطني | `/admin/operations-room/b2f` | لا يظهر B2B هنا |
| 3 | **غرفة مزاد الشركات (B2B)** | GM، مساعد B2B، مشرفو المزادات | `/admin/operations-room/b2b` | لا يظهر B2F هنا |
| 4 | **قيادة المزارع** | GM، مدير المزارع الوطني، مدير العمليات | `/admin/b2f/farm-command` | ليست "إضافة مزرعة" فقط |
| 5 | **لوحة المزرعة** | مدير المزرعة + فريقه + GM | `/admin/b2f/farms/:farmId` | ديناميكي - حسب farm_id |
| 6 | **عملي اليوم** | **كل الموظفين** | `/admin/my-work` | Landing لغير GM - متاح للجميع |
| 7 | **المالية والمحاسبة** | GM، مدير المالية، محاسب، مساعدو المالية | `/admin/finance` | قراءة/اعتماد حسب الدور |
| 8 | **التسويق** | GM، مدير التسويق، فريق التسويق | `/admin/marketing` | مستقل تماماً |
| 9 | **الشركاء/VIP** | GM، مدير الشركاء | `/admin/partners` | Coming Soon |
| 10 | **إدارة الموظفين والصلاحيات** | GM فقط | `/admin/settings/staff` | حصري للمدير العام |
| 11 | **إعدادات المنصة** | GM فقط | `/admin/settings` | حصري للمدير العام |

---

## 🔐 الأدوار المعرّفة

### الأدوار الإدارية
```typescript
type AdminRole =
  | 'general_manager'           // المدير العام - Bypass كامل
  | 'b2f_assistant'             // مساعد B2F
  | 'b2b_assistant'             // مساعد B2B
  | 'national_farm_manager'     // مدير المزارع الوطني
  | 'operations_manager'        // مدير العمليات
  | 'finance_manager'           // مدير المالية
  | 'marketing_manager'         // مدير التسويق
  | 'partners_manager'          // مدير الشركاء
```

### أدوار التنفيذ
```typescript
type ExecutiveRole =
  | 'farm_manager'              // مدير مزرعة
  | 'farm_supervisor'           // مشرف مزرعة
  | 'farm_worker'               // عامل مزرعة
  | 'accountant'                // محاسب
  | 'finance_assistant'         // مساعد مالية
  | 'marketing_staff'           // موظف تسويق
  | 'auction_supervisor'        // مشرف مزادات
```

---

## 🛠️ التطبيق التقني

### 1. البنية في قاعدة البيانات

```sql
-- جدول gateway_cards مع allowed_roles
CREATE TABLE gateway_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_key text UNIQUE NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  icon text NOT NULL,
  color text NOT NULL,
  gradient_from text,
  gradient_to text,
  route_path text NOT NULL,
  display_order int NOT NULL,
  allowed_roles jsonb DEFAULT '[]'::jsonb,  -- ⭐ القَسْمَة هنا
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- مثال: البيانات لبطاقة B2F Operations
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "b2f_assistant", "national_farm_manager"]'::jsonb
WHERE card_key = 'b2f_operations_room';
```

### 2. دالة التحقق من الظهور

```sql
CREATE FUNCTION get_user_gateway_cards(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  card_key text,
  title_ar text,
  -- ... باقي الحقول
  allowed_roles jsonb,
  user_role text,
  access_reason text,
  is_gm_access boolean
)
AS $$
DECLARE
  v_user_role text;
  v_is_gm boolean;
BEGIN
  -- الحصول على دور المستخدم
  SELECT role INTO v_user_role
  FROM platform_staff
  WHERE id = p_user_id AND is_active = true;

  -- التحقق: هل هو GM؟
  v_is_gm := (v_user_role = 'general_manager');

  -- إذا كان GM: إرجاع كل البطاقات
  IF v_is_gm THEN
    RETURN QUERY
    SELECT * FROM gateway_cards WHERE is_active = true;
  ELSE
    -- غير GM: فلترة حسب allowed_roles
    RETURN QUERY
    SELECT * FROM gateway_cards
    WHERE is_active = true
    AND (
      allowed_roles ? 'ALL'  -- متاح للجميع
      OR allowed_roles ? v_user_role  -- دور المستخدم موجود
      OR (card_key = 'farm_workspace' AND EXISTS (
        SELECT 1 FROM farm_team_members
        WHERE staff_id = p_user_id AND status = 'active'
      ))  -- معين على مزرعة
    );
  END IF;
END;
$$;
```

### 3. استخدام في React

```typescript
import { useGatewayAccess } from '../../hooks/useGatewayAccess';

export default function CrownSmartGateway() {
  const { cards, loading } = useGatewayAccess(userId);

  // cards الآن يحتوي فقط على البطاقات المصرح لها
  // GM يرى 11 بطاقة
  // موظف عادي يرى فقط ما يخص دوره + my_work

  return (
    <div className="grid grid-cols-4 gap-6">
      {cards.map((card) => (
        <GatewayCard key={card.id} card={card} />
      ))}
    </div>
  );
}
```

---

## 🧪 سيناريوهات الاختبار

### السيناريو 1: المدير العام

```javascript
// المستخدم: general_manager
// التوقع: 11 بطاقة (جميع البطاقات)

const session = {
  staffId: 'gm-uuid',
  role: 'general_manager'
};

const { cards } = useGatewayAccess(session.staffId);

console.assert(cards.length === 11, 'GM يجب أن يرى 11 بطاقة');
console.assert(cards.every(c => c.is_gm_access === true), 'جميع البطاقات مع GM Bypass');
```

### السيناريو 2: مساعد B2F

```javascript
// المستخدم: b2f_assistant
// التوقع: 3 بطاقات
//   1. my_work (متاح للجميع)
//   2. b2f_operations_room (حسب الدور)
//   3. farm_command (إذا كان ضمن الأدوار المصرح لها)

const session = {
  staffId: 'b2f-assistant-uuid',
  role: 'b2f_assistant'
};

const { cards } = useGatewayAccess(session.staffId);

console.assert(cards.some(c => c.card_key === 'my_work'), 'my_work متاح');
console.assert(cards.some(c => c.card_key === 'b2f_operations_room'), 'B2F Ops متاح');
console.assert(!cards.some(c => c.card_key === 'b2b_operations_room'), 'B2B Ops ممنوع');
```

### السيناريو 3: مدير مزرعة

```javascript
// المستخدم: farm_manager
// التوقع: 2-3 بطاقات
//   1. my_work (متاح للجميع)
//   2. farm_workspace (إذا معين على مزرعة)
//   3. ربما farm_command (حسب الصلاحيات الإضافية)

const session = {
  staffId: 'farm-manager-uuid',
  role: 'farm_manager'
};

const { cards } = useGatewayAccess(session.staffId);

console.assert(cards.some(c => c.card_key === 'my_work'), 'my_work متاح');
console.assert(cards.some(c => c.card_key === 'farm_workspace'), 'Farm Workspace متاح');
```

### السيناريو 4: موظف عادي بدون دور محدد

```javascript
// المستخدم: staff (دور غير معرف)
// التوقع: 1 بطاقة فقط
//   1. my_work (متاح للجميع)

const session = {
  staffId: 'staff-uuid',
  role: 'regular_staff'
};

const { cards } = useGatewayAccess(session.staffId);

console.assert(cards.length === 1, 'موظف عادي يرى بطاقة واحدة');
console.assert(cards[0].card_key === 'my_work', 'البطاقة الوحيدة هي my_work');
```

---

## 🔍 عرض جدول القَسْمَة

للمدراء والمطورين، يمكن عرض جدول القَسْمَة كاملاً:

### في الكود

```typescript
import GatewayMappingTable from './components/platform/GatewayMappingTable';

// في /admin/settings أو صفحة خاصة بالمطور
<GatewayMappingTable />
```

### عبر SQL

```sql
-- عرض جدول القَسْمَة الكامل
SELECT * FROM get_gateway_mapping_table();

-- أو عبر View
SELECT * FROM gateway_cards_mapping
ORDER BY display_order;
```

**النتيجة:**
```
| card_key               | title_ar                  | allowed_roles                                      | roles_count | notes              |
|------------------------|---------------------------|---------------------------------------------------|-------------|--------------------|
| executive_command      | غرفة القيادة العليا       | ["general_manager"]                               | 1           | GM Only - Bypass   |
| b2f_operations_room    | غرفة استثمار أشجار المزارع | ["general_manager","b2f_assistant","national_farm_manager"] | 3 | Role-based access  |
| my_work                | عملي اليوم                | ["ALL"]                                           | 1           | متاح للجميع        |
| ...                    | ...                       | ...                                               | ...         | ...                |
```

---

## 🎨 التكامل مع الواجهة

### 1. عرض البطاقات في البوابة

```typescript
// CrownSmartGateway.tsx
{cards.map((card) => (
  <SmartGatewayCard
    key={card.id}
    card={card}
    showAccessReason={true}  // عرض سبب الوصول (GM Bypass / Role-based / etc)
  />
))}
```

### 2. عرض معلومات الدور

```typescript
// في SmartGatewayCard
{card.is_gm_access && (
  <div className="absolute top-2 right-2 bg-purple-100 px-2 py-1 rounded-lg">
    <span className="text-xs font-bold text-purple-700">GM Bypass</span>
  </div>
)}

{!card.is_gm_access && card.access_reason && (
  <div className="text-xs text-gray-500 mt-2">
    {card.access_reason}
  </div>
)}
```

---

## 🚀 الخطوة التالية: Guards على المسارات

بعد نجاح القَسْمَة والظهور الصحيح، الخطوة التالية:

### 1. Route Guards

إنشاء Guards لمنع الدخول اليدوي لمسار غير مصرح:

```typescript
// guards/GatewayGuard.tsx
const GatewayGuard = ({ cardKey, children }) => {
  const canAccess = useGatewayAccess().checkAccess(userId, cardKey);

  if (!canAccess) {
    return <Navigate to="/admin/gateway?error=access_denied" />;
  }

  return children;
};

// في App.tsx
<Route path="/admin/operations-room/b2f" element={
  <GatewayGuard cardKey="b2f_operations_room">
    <B2FOperationsRoom />
  </GatewayGuard>
} />
```

### 2. Permission Checks داخل الأقسام

بعد الدخول للقسم، فحص صلاحيات محددة:

```typescript
// داخل B2FOperationsRoom
const { hasPermission } = useRolePermissions();

{hasPermission('approve_investment') && (
  <button onClick={handleApprove}>اعتماد الطلب</button>
)}
```

---

## 📝 ملخص

✅ **تم تطبيق القَسْمَة:**
- 11 بطاقة رسمية مع `allowed_roles` لكل بطاقة
- دالة `get_user_gateway_cards` تطبق القَسْمَة تلقائياً
- GM Bypass دائماً نشط
- `my_work` متاح للجميع

⏭️ **الخطوات القادمة:**
1. تطبيق Route Guards على كل مسار
2. تطبيق Permission Checks داخل الأقسام
3. Audit Logs لتتبع محاولات الوصول
4. Testing شامل لكل دور

---

**تاريخ التحديث:** 2026-01-06
**الإصدار:** 1.0 (القَسْمَة الأولى)
