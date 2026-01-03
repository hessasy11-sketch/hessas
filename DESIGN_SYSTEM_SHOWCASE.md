# نظام التصميم - مركز القيادة المتقدم

## نظرة عامة على النظام البصري

هذا الدليل يشرح بالتفصيل جميع المكونات البصرية المستخدمة في الواجهة الجديدة.

---

## 1. نظام الألوان

### الألوان الأساسية

#### الخلفيات الداكنة
```css
الخلفية الرئيسية:
- from-slate-950 (أسود داكن)
- via-slate-900 (رمادي داكن جداً)
- to-slate-950 (أسود داكن)

البطاقات:
- bg-white/5 (أبيض شفاف 5%)
- backdrop-blur-sm (تمويه خفيف)
- border: border-white/10 (حدود شفافة 10%)
```

#### تدرجات الأقسام
```css
B2B (المزادات):
from-blue-500 to-cyan-500
الاستخدام: بطاقات الموظفين، الشارات، الأيقونات

B2F (المزارع):
from-emerald-500 to-teal-500
الاستخدام: أزرار الإضافة، بطاقات القسم

HQ (الإدارة):
from-purple-500 to-pink-500
الاستخدام: بطاقات المدراء، رأس الصفحة
```

#### ألوان الحالة
```css
نشط: text-emerald-400 / bg-emerald-500/20
معطل: text-red-400 / bg-red-500/20
قيد المراجعة: text-orange-400 / bg-orange-500/20
محايد: text-gray-400 / bg-gray-500/20
```

---

## 2. الطباعة والخطوط

### أحجام النصوص
```css
العناوين الرئيسية:
text-4xl (36px) font-black

العناوين الفرعية:
text-2xl (24px) font-bold

النصوص العادية:
text-base (16px) font-medium

النصوص الصغيرة:
text-sm (14px) font-normal

النصوص الدقيقة:
text-xs (12px) font-bold
```

### أوزان الخطوط
```css
font-black: 900 - للعناوين الرئيسية
font-bold: 700 - للعناوين الفرعية والأزرار
font-medium: 500 - للنصوص العادية
font-normal: 400 - للنصوص الثانوية
```

---

## 3. المسافات والأبعاد

### التباعد (Spacing)
```css
p-8: padding كبير للأقسام الرئيسية
p-6: padding متوسط للبطاقات
p-4: padding صغير للعناصر الداخلية
p-3: padding دقيق للأزرار

gap-8: فراغات كبيرة بين الأقسام
gap-6: فراغات متوسطة بين البطاقات
gap-4: فراغات صغيرة بين العناصر
gap-2: فراغات دقيقة داخل العناصر
```

### الحواف المستديرة
```css
rounded-3xl: حواف كبيرة جداً (24px) - للأقسام الرئيسية
rounded-2xl: حواف كبيرة (16px) - للبطاقات
rounded-xl: حواف متوسطة (12px) - للأزرار
rounded-lg: حواف صغيرة (8px) - للعناصر الداخلية
rounded-full: دائرية كاملة - للشارات والأيقونات الصغيرة
```

---

## 4. الظلال والتأثيرات

### الظلال (Shadows)
```css
shadow-lg: ظل كبير للبطاقات المهمة
shadow-xl: ظل أكبر للبطاقات التفاعلية
shadow-2xl: ظل ضخم للعناصر البارزة

الظلال الملونة:
shadow-blue-500/50: ظل أزرق بشفافية 50%
shadow-emerald-500/50: ظل أخضر بشفافية 50%
shadow-purple-500/50: ظل بنفسجي بشفافية 50%
```

### التمويه (Blur)
```css
backdrop-blur-sm: تمويه خفيف للخلفيات
backdrop-blur-xl: تمويه قوي للتأثيرات الخاصة
blur-xl: تمويه قوي للخلفيات الديناميكية
```

---

## 5. التحولات والحركات

### المدة الزمنية
```css
transition-all: تأثير على جميع الخصائص
duration-300: مدة 300ms (قياسية)
duration-500: مدة 500ms (بطيئة)
duration-150: مدة 150ms (سريعة)
```

### تأثيرات التكبير
```css
hover:scale-105: تكبير 5% عند التحويم
hover:scale-102: تكبير 2% عند التحويم (خفيف)
active:scale-95: تصغير 5% عند النقر
```

### الحركات المتكررة
```css
animate-spin: دوران مستمر (للتحميل)
animate-pulse: نبض (للتنبيهات)
animate-ping: موجة (للإشعارات الجديدة)
```

---

## 6. الأيقونات

### الأحجام
```css
w-3 h-3: أيقونات صغيرة جداً (12px) - داخل الشارات
w-4 h-4: أيقونات صغيرة (16px) - داخل الأزرار الصغيرة
w-5 h-5: أيقونات متوسطة (20px) - الأزرار القياسية
w-6 h-6: أيقونات كبيرة (24px) - العناوين
w-8 h-8: أيقونات كبيرة جداً (32px) - البطاقات الرئيسية
w-10 h-10: أيقونات ضخمة (40px) - الرأس
```

### الاستخدامات
```css
Shield: الحماية والأمان
Users: إدارة المستخدمين
Activity: النشاط والحركة
TrendingUp: النمو والإحصائيات
QrCode: نظام QR
Lock: الصلاحيات
Power/PowerOff: التفعيل/التعطيل
Eye: العرض
Edit3: التعديل
Trash2: الحذف
```

---

## 7. الأزرار

### الأزرار الرئيسية
```css
الأخضر (إضافة):
bg-gradient-to-r from-emerald-500 to-teal-500
hover:from-emerald-600 hover:to-teal-600
shadow-lg shadow-emerald-500/50

الأزرق (عرض):
bg-gradient-to-r from-blue-500 to-purple-500
hover:from-blue-600 hover:to-purple-600
shadow-lg shadow-blue-500/50
```

### الأزرار الثانوية
```css
شفاف:
bg-white/10 backdrop-blur-sm
border: border-white/20
hover:bg-white/20

ملون خفيف:
bg-blue-500/20 text-blue-400
hover:bg-blue-500/30
```

### أزرار الإجراءات
```css
تفعيل:
bg-emerald-500/20 text-emerald-400
hover:bg-emerald-500/30

تعطيل:
bg-red-500/20 text-red-400
hover:bg-red-500/30

تعديل:
bg-purple-500/20 text-purple-400
hover:bg-purple-500/30
```

---

## 8. البطاقات

### بطاقة موظف (Grid)
```css
الهيكل:
rounded-2xl (حواف مستديرة)
bg-white/5 (خلفية شفافة)
backdrop-blur-sm (تمويه خفيف)
border border-white/10 (حدود شفافة)
p-6 (padding داخلي)

التأثيرات:
hover:bg-white/10 (تغيير الخلفية)
hover:scale-105 (تكبير 5%)
transition-all duration-300 (انتقال سلس)

المحتوى:
1. الأيقونة (w-16 h-16) بتدرج لوني
2. الاسم (text-xl font-black)
3. التواصل (text-sm text-gray-400)
4. الشارات (px-3 py-2 rounded-lg)
5. الأزرار (flex gap-2)
```

### بطاقة إحصائية
```css
الهيكل:
rounded-2xl
bg-white/5
border border-white/10
p-6

المحتوى:
1. أيقونة (w-12 h-12 rounded-xl) بتدرج
2. الرقم (text-3xl font-black)
3. العنوان (text-sm text-gray-400)
4. الاتجاه (text-xs text-emerald-400)

التأثيرات:
hover:scale-105
group-hover:opacity-10 (خلفية ملونة)
```

---

## 9. الجداول

### تصميم الجدول (List View)
```css
الحاوية:
rounded-2xl
bg-white/5
backdrop-blur-sm
border border-white/10
overflow-hidden

الرأس:
border-b border-white/10
p-4
text-sm font-bold text-gray-400

الصفوف:
border-b border-white/5
hover:bg-white/5
transition-colors
p-4

الخلايا:
text-right (محاذاة لليمين)
مسافات مناسبة بين الأعمدة
```

---

## 10. النماذج والمدخلات

### حقول الإدخال
```css
input:
pr-12 pl-4 py-3 (مساحة للأيقونة)
bg-white/5 (خلفية شفافة)
border border-white/10
rounded-xl
text-white
placeholder-gray-500
focus:outline-none
focus:ring-2
focus:ring-blue-500
focus:border-transparent
```

### القوائم المنسدلة
```css
select:
px-4 py-3
bg-white/5
border border-white/10
rounded-xl
text-white
focus:outline-none
focus:ring-2
focus:ring-blue-500
```

---

## 11. الشارات والعلامات

### شارة القسم
```css
px-3 py-1.5
rounded-full
text-xs font-bold
bg-gradient-to-r ${color}
text-white
shadow-sm
```

### شارة الحالة
```css
flex items-center gap-1
px-3 py-1
rounded-full
text-xs font-bold
bg-${color}-500/20
text-${color}-400
```

---

## 12. الحالات الخاصة

### شاشة التحميل
```css
المركز:
flex items-center justify-center
py-16 أو min-h-screen

الأيقونة:
w-20 h-20
تأثيرات متعددة:
- absolute inset-0 bg-gradient animate-ping opacity-20
- absolute inset-0 bg-gradient animate-pulse
- relative z-10 animate-spin

النص:
text-xl font-bold text-white
text-gray-400 mt-2
```

### شاشة فارغة
```css
المركز:
text-center
py-12

الأيقونة:
w-16 h-16 أو w-20 h-20
mx-auto mb-4
rounded-full
bg-gray-500/10
text-gray-400

النص:
text-xl font-bold text-gray-400
text-gray-500 text-sm mt-2
```

---

## 13. الشبكة الاستجابية

### نقاط القطع (Breakpoints)
```css
sm: 640px وأكثر
md: 768px وأكثر
lg: 1024px وأكثر
xl: 1280px وأكثر
2xl: 1536px وأكثر
```

### تخطيط الشبكة
```css
الإحصائيات:
grid-cols-1 (Mobile)
md:grid-cols-2 (Tablet)
lg:grid-cols-4 (Desktop)
xl:grid-cols-6 (Large Desktop)

البطاقات:
grid-cols-1 (Mobile)
md:grid-cols-2 (Tablet)
lg:grid-cols-3 (Desktop)
xl:grid-cols-4 (Large Desktop)
```

---

## 14. النصائح والممارسات الأفضل

### 1. الاتساق
- استخدم نفس التدرجات اللونية للعناصر المشابهة
- حافظ على نفس الأبعاد للعناصر المتشابهة
- استخدم نفس المدة الزمنية للتحولات

### 2. التباين
- تأكد من وضوح النصوص على الخلفيات
- استخدم ألوان متباينة للأزرار المهمة
- اجعل العناصر التفاعلية واضحة

### 3. الوصولية
- استخدم أحجام خطوط مقروءة
- اجعل الأزرار كبيرة بما يكفي للنقر
- وفر تباين لوني كافٍ للنصوص

### 4. الأداء
- استخدم backdrop-blur بحذر
- قلل من الظلال المعقدة
- استخدم will-change للعناصر المتحركة

### 5. التناسق
- حافظ على نفس padding للبطاقات المتشابهة
- استخدم نفس gap بين العناصر المتشابهة
- اجعل جميع الحواف المستديرة متناسقة

---

## 15. الخلاصة

نظام التصميم هذا يوفر:
- واجهة موحدة ومتسقة
- تجربة مستخدم سلسة
- سهولة في التطوير والصيانة
- قابلية للتوسع والتخصيص

جميع المكونات قابلة لإعادة الاستخدام ومتوافقة مع Tailwind CSS v3.

---

**تم التوثيق بواسطة**: فريق التصميم
**التاريخ**: 2026-01-03
**الإصدار**: 1.0.0
