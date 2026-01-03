import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const verificationCode = url.searchParams.get('code');
    const certificateNumber = url.searchParams.get('number');

    if (!verificationCode && !certificateNumber) {
      return new Response(
        JSON.stringify({ 
          error: 'يجب توفير كود التحقق أو رقم الشهادة',
          valid: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // البحت عن الشهادة
    let query = supabase
      .from('investment_certificates')
      .select(`
        *,
        contract:b2f_contracts(
          contract_number,
          tree_count,
          total_amount,
          investor_account:b2f_investor_accounts(
            contact_name
          ),
          farm:farms(
            name,
            location
          ),
          opportunity:investment_opportunities(
            title
          )
        )
      `);

    if (verificationCode) {
      query = query.eq('verification_code', verificationCode);
    } else if (certificateNumber) {
      query = query.eq('certificate_number', certificateNumber);
    }

    const { data: certificate, error: certError } = await query.maybeSingle();

    if (certError) {
      console.error('Error fetching certificate:', certError);
      return new Response(
        JSON.stringify({ 
          error: 'حدث خطأ أثناء التحقق من الشهادة',
          valid: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!certificate) {
      return new Response(
        JSON.stringify({ 
          error: 'الشهادة غير موجودة',
          valid: false,
          message: 'لم نتمكن من العثور على شهادة بهذا الرقم'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من حالة الشهادة
    const isValid = certificate.status === 'active';
    const isExpired = new Date(certificate.expiry_date) < new Date();

    let statusMessage = 'الشهادة صالحة ونشطة';
    let statusColor = 'green';

    if (certificate.status === 'cancelled') {
      statusMessage = 'الشهادة ملغاة';
      statusColor = 'red';
    } else if (certificate.status === 'suspended') {
      statusMessage = 'الشهادة معلقة';
      statusColor = 'orange';
    } else if (isExpired) {
      statusMessage = 'انتهت صلاحية الشهادة';
      statusColor = 'gray';
    }

    // إعداد معلومات الشهادة
    const certificateInfo = {
      valid: isValid && !isExpired,
      status: certificate.status,
      statusMessage,
      statusColor,
      certificateNumber: certificate.certificate_number,
      verificationCode: certificate.verification_code,
      issueDate: certificate.issue_date,
      expiryDate: certificate.expiry_date,
      isExpired,
      investorName: certificate.contract?.investor_account?.contact_name || 'غير محدد',
      farmName: certificate.farm_name || certificate.contract?.farm?.name || certificate.contract?.opportunity?.title || 'غير محدد',
      treeCount: certificate.tree_count || certificate.contract?.tree_count || 0,
      leaseDuration: certificate.lease_duration_years || 5,
      totalAmount: certificate.total_amount || certificate.contract?.total_amount || 0,
      contractNumber: certificate.contract?.contract_number || 'غير محدد',
      location: certificate.contract?.farm?.location || 'غير محدد'
    };

    // تسجيل عملية التحقق
    await supabase
      .from('certificate_issuance_log')
      .insert({
        certificate_id: certificate.id,
        contract_id: certificate.contract_id,
        event_type: 'issued',
        event_details: 'تم التحقق من الشهادة عبر QR Code',
        success: true
      });

    return new Response(
      JSON.stringify(certificateInfo),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-certificate:', error);
    return new Response(
      JSON.stringify({ 
        error: 'حدث خطأ أثناء التحقق',
        valid: false,
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});