import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContractRequest {
  contract_id: string;
}

// توليد HTML فاخر للعقد
function generateLuxuryContractHTML(contract: any, request: any, farm: any): string {
  const startDate = new Date(contract.start_date).toLocaleDateString('ar-SA');
  const endDate = new Date(contract.end_date).toLocaleDateString('ar-SA');
  const issuedDate = new Date(contract.created_at).toLocaleDateString('ar-SA');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>عقد استثمار - ${contract.contract_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', 'Amiri', serif;
      background: linear-gradient(135deg, #f5e6d3 0%, #d4a574 100%);
      padding: 40px 20px;
      line-height: 1.8;
    }

    .contract-container {
      max-width: 900px;
      margin: 0 auto;
      background: linear-gradient(to bottom, #fefdfb 0%, #f8f5f0 100%);
      box-shadow: 0 20px 60px rgba(139, 90, 43, 0.3);
      border-radius: 0;
      overflow: hidden;
      border: 20px solid;
      border-image: linear-gradient(135deg, #d4af37 0%, #f4e5c3 25%, #d4af37 50%, #f4e5c3 75%, #d4af37 100%) 1;
      position: relative;
    }

    .contract-container::before {
      content: '';
      position: absolute;
      top: 15px;
      left: 15px;
      right: 15px;
      bottom: 15px;
      border: 2px solid rgba(212, 175, 55, 0.3);
      pointer-events: none;
      z-index: 1;
    }

    .contract-container::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(212, 175, 55, 0.03) 10px, rgba(212, 175, 55, 0.03) 20px),
        repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(212, 175, 55, 0.03) 10px, rgba(212, 175, 55, 0.03) 20px);
      pointer-events: none;
    }

    .contract-header {
      background: linear-gradient(135deg, #8b6914 0%, #d4af37 50%, #8b6914 100%);
      padding: 50px 40px;
      text-align: center;
      color: white;
      position: relative;
      overflow: hidden;
      z-index: 2;
      border-bottom: 4px solid #d4af37;
    }

    .contract-header::before {
      content: '✦';
      position: absolute;
      top: 20px;
      right: 40px;
      font-size: 3rem;
      color: rgba(255, 255, 255, 0.15);
      z-index: 0;
    }

    .contract-header::after {
      content: '✦';
      position: absolute;
      top: 20px;
      left: 40px;
      font-size: 3rem;
      color: rgba(255, 255, 255, 0.15);
      z-index: 0;
    }

    .contract-header h1 {
      font-size: 2.8rem;
      font-weight: 700;
      margin-bottom: 15px;
      position: relative;
      z-index: 1;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      font-family: 'Amiri', serif;
    }

    .contract-number {
      font-size: 1.4rem;
      font-weight: 600;
      letter-spacing: 3px;
      position: relative;
      z-index: 1;
      background: rgba(255, 255, 255, 0.2);
      display: inline-block;
      padding: 10px 30px;
      border-radius: 50px;
      border: 2px solid rgba(255, 255, 255, 0.4);
    }

    .contract-body {
      padding: 50px 60px;
    }

    .section {
      margin-bottom: 35px;
    }

    .section-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: #8b6914;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #d4af37;
      position: relative;
      font-family: 'Amiri', serif;
    }

    .section-title::before {
      content: '◆';
      margin-left: 10px;
      color: #d4af37;
      font-size: 0.9em;
    }

    .section-title::after {
      content: '';
      position: absolute;
      bottom: -3px;
      right: 0;
      width: 80px;
      height: 3px;
      background: linear-gradient(90deg, #d4af37 0%, transparent 100%);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }

    .info-item {
      background: linear-gradient(135deg, #fefdfb 0%, #f8f3ea 100%);
      padding: 20px;
      border-radius: 8px;
      border-right: 4px solid #d4af37;
      border: 1px solid rgba(212, 175, 55, 0.3);
      transition: transform 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .info-item::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      height: 40px;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%);
    }

    .info-item:hover {
      transform: translateX(-5px);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
    }

    .info-label {
      font-size: 0.9rem;
      color: #8b6914;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .info-value {
      font-size: 1.2rem;
      color: #2d2013;
      font-weight: 700;
    }

    .highlight-box {
      background: linear-gradient(135deg, #8b6914 0%, #d4af37 50%, #8b6914 100%);
      color: white;
      padding: 35px;
      border-radius: 8px;
      margin: 35px 0;
      text-align: center;
      box-shadow: 0 10px 30px rgba(212, 175, 55, 0.4);
      border: 3px solid rgba(255, 255, 255, 0.3);
      position: relative;
    }

    .highlight-box::before {
      content: '◆◆◆';
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 255, 255, 0.3);
      font-size: 0.8rem;
      letter-spacing: 8px;
    }

    .highlight-box h3 {
      font-size: 1.8rem;
      margin-bottom: 15px;
      font-family: 'Amiri', serif;
      margin-top: 10px;
    }

    .highlight-box p {
      font-size: 3.2rem;
      font-weight: 700;
      margin: 10px 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    }

    .terms-list {
      list-style: none;
      padding: 0;
    }

    .terms-list li {
      padding: 15px 20px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #fefdfb 0%, #f8f3ea 100%);
      border-radius: 6px;
      border-right: 4px solid #d4af37;
      border: 1px solid rgba(212, 175, 55, 0.2);
      font-size: 1.05rem;
      transition: all 0.3s ease;
    }

    .terms-list li:hover {
      background: #f8f3ea;
      transform: translateX(-5px);
      box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);
    }

    .terms-list li::before {
      content: '◈';
      display: inline-block;
      margin-left: 10px;
      color: #d4af37;
      font-weight: bold;
      font-size: 1.3rem;
    }

    .contract-footer {
      background: linear-gradient(135deg, #2d2013 0%, #1a1410 100%);
      padding: 50px 40px;
      text-align: center;
      color: #f4e5c3;
      position: relative;
      z-index: 2;
      border-top: 4px solid #d4af37;
    }

    .contract-footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 4px;
      background: linear-gradient(90deg, transparent 0%, #d4af37 50%, transparent 100%);
    }

    .seal {
      width: 140px;
      height: 140px;
      margin: 20px auto;
      background: radial-gradient(circle, #ffd700 0%, #d4af37 60%, #8b6914 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      color: #2d2013;
      box-shadow:
        0 8px 25px rgba(212, 175, 55, 0.5),
        0 0 0 8px rgba(212, 175, 55, 0.2),
        0 0 0 16px rgba(212, 175, 55, 0.1);
      border: 6px double #2d2013;
      text-align: center;
      line-height: 1.4;
      position: relative;
      font-family: 'Amiri', serif;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .seal::before {
      content: '';
      position: absolute;
      width: 160px;
      height: 160px;
      border: 3px dotted rgba(212, 175, 55, 0.4);
      border-radius: 50%;
      animation: rotate 30s linear infinite;
    }

    .seal::after {
      content: '★';
      position: absolute;
      top: 10px;
      font-size: 1.5rem;
      color: #2d2013;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .footer-text {
      margin-top: 25px;
      font-size: 0.95rem;
      line-height: 1.9;
      color: #f4e5c3;
    }

    .footer-text strong {
      color: #d4af37;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .contract-container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="contract-container">
    <!-- رأس العقد -->
    <div class="contract-header">
      <h1>🌳 وثيقة عقد استثمار أشجار المزارع 🌳</h1>
      <div class="contract-number">رقم العقد: ${contract.contract_number}</div>
    </div>

    <!-- محتوى العقد -->
    <div class="contract-body">
      <!-- معلومات المستثمر -->
      <div class="section">
        <h2 class="section-title">بيانات المستثمر</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">الاسم الكامل</div>
            <div class="info-value">${request.investor_name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">رقم الجوال</div>
            <div class="info-value">${contract.investor_phone}</div>
          </div>
        </div>
      </div>

      <!-- تفاصيل الاستثمار -->
      <div class="section">
        <h2 class="section-title">تفاصيل الاستثمار</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">اسم المزرعة</div>
            <div class="info-value">${farm.name || 'مزرعة الاستثمار'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">نوع الأشجار</div>
            <div class="info-value">${request.tree_type}</div>
          </div>
          <div class="info-item">
            <div class="info-label">عدد الأشجار</div>
            <div class="info-value">${contract.trees_count} شجرة</div>
          </div>
          <div class="info-item">
            <div class="info-label">سعر الشجرة</div>
            <div class="info-value">${request.price_per_tree} ر.س</div>
          </div>
        </div>
      </div>

      <!-- القيمة الإجمالية -->
      <div class="highlight-box">
        <h3>القيمة الإجمالية للاستثمار</h3>
        <p>${contract.amount_total.toLocaleString('ar-SA')} ر.س</p>
      </div>

      <!-- مدة العقد -->
      <div class="section">
        <h2 class="section-title">مدة العقد</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">تاريخ البداية</div>
            <div class="info-value">${startDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">تاريخ الانتهاء</div>
            <div class="info-value">${endDate}</div>
          </div>
        </div>
      </div>

      <!-- الشروط والأحكام -->
      <div class="section">
        <h2 class="section-title">الشروط والأحكام</h2>
        <ul class="terms-list">
          <li>يحق للمستثمر متابعة أشجاره عبر المنصة والحصول على تقارير دورية</li>
          <li>تلتزم المنصة بالعناية الكاملة بالأشجار وفق معايير الزراعة المستدامة</li>
          <li>يتم توزيع العوائد حسب الاتفاق المبرم في بداية الموسم</li>
          <li>يمكن للمستثمر زيارة المزرعة بعد التنسيق المسبق</li>
          <li>العقد ساري المفعول طوال المدة المحددة ما لم يتم الاتفاق على خلاف ذلك</li>
        </ul>
      </div>

      <!-- تاريخ الإصدار -->
      <div class="section" style="text-align: center; margin-top: 40px;">
        <p style="font-size: 1.1rem; color: #666;">
          تاريخ إصدار العقد: <strong>${issuedDate}</strong>
        </p>
      </div>
    </div>

    <!-- تذييل العقد -->
    <div class="contract-footer">
      <div class="seal">
        ختم رسمي<br/>منصة<br/><strong>B2F</strong>
      </div>
      <div class="footer-text">
        <strong>تم إصدار هذه الوثيقة إلكترونياً عبر منصة حصص زراعية</strong><br/><br/>
        منصة استثمار أشجار المزارع (B2F) - الربط بين المزارع والمستثمرين<br/>
        للاستفسار: <strong>support@b2f.sa</strong> | الدعم الفني: <strong>920000000</strong><br/>
        <br/>
        جميع الحقوق محفوظة © 2025 منصة B2F
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contract_id }: ContractRequest = await req.json();

    if (!contract_id) {
      throw new Error('contract_id is required');
    }

    console.log(`[Contract] Generating luxury PDF for ${contract_id}`);

    // جلب بيانات العقد الكاملة
    const { data: contract, error: contractError } = await supabase
      .from('b2f_contracts')
      .select('*')
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    // جلب بيانات الطلب
    const { data: request, error: requestError } = await supabase
      .from('b2f_sales_requests')
      .select('*')
      .eq('id', contract.sales_request_id)
      .single();

    if (requestError || !request) {
      throw new Error('Request not found');
    }

    // جلب بيانات المزرعة
    const { data: farm, error: farmError } = await supabase
      .from('b2f_farms')
      .select('*')
      .eq('id', contract.farm_id)
      .single();

    if (farmError || !farm) {
      throw new Error('Farm not found');
    }

    // توليد HTML الفاخر
    const htmlContent = generateLuxuryContractHTML(contract, request, farm);

    // حفظ HTML في Storage
    const fileName = `${contract.contract_number}.html`;
    const filePath = `contracts/${new Date().getFullYear()}/${contract.farm_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('b2f-payment-receipts')
      .upload(filePath, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
    }

    // الحصول على رابط عام
    const { data: urlData } = supabase.storage
      .from('b2f-payment-receipts')
      .getPublicUrl(filePath);

    const documentUrl = urlData.publicUrl;

    // تحديث العقد بالرابط
    await supabase
      .from('b2f_contracts')
      .update({
        document_url: documentUrl,
        pdf_generated: true
      })
      .eq('id', contract_id);

    console.log(`[Contract] Luxury PDF generated: ${documentUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        document_url: documentUrl,
        contract_number: contract.contract_number,
        message: 'تم توليد وثيقة العقد الفاخرة بنجاح'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[Contract] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
