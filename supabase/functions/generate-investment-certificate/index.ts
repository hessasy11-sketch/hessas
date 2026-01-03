import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CertificateRequest {
  contractId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contractId }: CertificateRequest = await req.json();

    if (!contractId) {
      return new Response(
        JSON.stringify({ error: 'معرف العقد مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1️⃣ جلب بيانات العقد
    const { data: contract, error: contractError } = await supabase
      .from('b2f_contracts')
      .select(`
        *,
        investor_account:b2f_investor_accounts(*),
        opportunity:investment_opportunities(*),
        farm:farms(*)
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return new Response(
        JSON.stringify({ error: 'العقد غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2️⃣ التحقق من حالة العقد
    if (contract.status !== 'payment_verified') {
      return new Response(
        JSON.stringify({ error: 'يجب أن يكون العقد في حالة "تم التحقق من الدفع"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3️⃣ التحقق من عدم إصدار شهادة مسبقاً
    const { data: existingCert } = await supabase
      .from('investment_certificates')
      .select('id, certificate_number')
      .eq('contract_id', contractId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingCert) {
      return new Response(
        JSON.stringify({ 
          error: 'تم إصدار شهادة لهذا العقد مسبقاً',
          certificateNumber: existingCert.certificate_number
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4️⃣ توليد رقم الشهادة وكود التحقق
    const { data: certNumber } = await supabase.rpc('generate_certificate_number');
    const { data: verificationCode } = await supabase.rpc('generate_verification_code');

    // 5️⃣ حساب تاريخ الانتهاء (بناءً على مدة الإيجار)
    const leaseDurationYears = contract.lease_duration_years || 5;
    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + leaseDurationYears);

    // 6️⃣ إنشاء بيانات QR Code
    const qrData = JSON.stringify({
      certNumber: certNumber || 'B2F-25-0001',
      verificationCode: verificationCode || 'XXXXXXXX',
      issueDate: issueDate.toISOString(),
      investorName: contract.investor_account?.contact_name || 'غير محدد',
      farmName: contract.farm?.name || contract.opportunity?.title || 'غير محدد',
      treeCount: contract.tree_count || 0,
      verifyUrl: `${supabaseUrl}/verify-certificate/${verificationCode}`
    });

    // 7️⃣ إدراج الشهادة في قاعدة البيانات
    const { data: certificate, error: certError } = await supabase
      .from('investment_certificates')
      .insert({
        contract_id: contractId,
        investor_account_id: contract.investor_account_id,
        certificate_number: certNumber || 'B2F-25-0001',
        issue_date: issueDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        qr_code_data: qrData,
        verification_code: verificationCode || 'XXXXXXXX',
        pdf_generated: false,
        status: 'active',
        farm_name: contract.farm?.name || contract.opportunity?.title || 'غير محدد',
        tree_count: contract.tree_count || 0,
        lease_duration_years: leaseDurationYears,
        total_amount: contract.total_amount || 0
      })
      .select()
      .single();

    if (certError) {
      console.error('Error creating certificate:', certError);
      return new Response(
        JSON.stringify({ error: 'فشل في إنشاء الشهادة', details: certError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8️⃣ تحديث حالة العقد
    await supabase
      .from('b2f_contracts')
      .update({
        status: 'certificate_issued',
        certificate_issued: true,
        certificate_id: certificate.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    // 9️⃣ تسجيل الحدث
    await supabase
      .from('certificate_issuance_log')
      .insert({
        certificate_id: certificate.id,
        contract_id: contractId,
        event_type: 'issued',
        event_details: `تم إصدار الشهادة رقم ${certificate.certificate_number}`,
        success: true
      });

    // 🔟 إنشاء إشعار للمستثمر
    await supabase
      .from('notifications')
      .insert({
        user_phone: contract.investor_account?.contact_phone,
        type: 'certificate_issued',
        title: '🎉 تم إصدار شهادة الاستثمار',
        message: `تم إصدار شهادة الاستثمار رقم ${certificate.certificate_number} بنجاح. يمكنك الآن تحميلها وعرضها.`,
        priority: 'high',
        data: {
          certificateId: certificate.id,
          certificateNumber: certificate.certificate_number,
          contractId: contractId
        }
      });

    // 1️⃣1️⃣ إرسال للمراجعة المالية
    if (contract.receipt_url) {
      await supabase
        .from('financial_reviews')
        .insert({
          contract_id: contractId,
          investor_account_id: contract.investor_account_id,
          receipt_url: contract.receipt_url,
          review_status: 'pending',
          amount_expected: contract.total_amount || 0,
          amount_paid: contract.total_amount || 0,
          payment_date: new Date().toISOString().split('T')[0],
          admin_approved: true,
          priority: 'normal'
        });

      // إشعار للقسم المالي
      await supabase
        .from('notifications')
        .insert({
          user_phone: '+966500000001', // رقم القسم المالي
          type: 'financial_review_pending',
          title: '💰 مراجعة مالية جديدة',
          message: `تم إرسال إيصال دفع جديد للمراجعة - العقد ${contract.contract_number}`,
          priority: 'high',
          data: {
            contractId: contractId,
            investorName: contract.investor_account?.contact_name,
            amount: contract.total_amount
          }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificate_number,
          verificationCode: certificate.verification_code,
          issueDate: certificate.issue_date,
          expiryDate: certificate.expiry_date,
          qrCodeData: certificate.qr_code_data
        },
        message: 'تم إصدار الشهادة بنجاح'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-investment-certificate:', error);
    return new Response(
      JSON.stringify({ 
        error: 'حدث خطأ أثناء إصدار الشهادة',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});