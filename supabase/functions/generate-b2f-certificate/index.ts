import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CertificateRequest {
  reservationId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reservationId }: CertificateRequest = await req.json();

    if (!reservationId) {
      return new Response(
        JSON.stringify({ error: 'معرف الحجز مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب بيانات الحجز مع العقد
    const { data: reservation, error: resError } = await supabase
      .from('investment_reservations')
      .select(`
        *,
        b2f_opportunities (
          title,
          tree_type,
          contract_duration_years,
          b2f_farms (
            name,
            location
          )
        ),
        b2f_contracts!inner (
          id,
          contract_number,
          status
        )
      `)
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      return new Response(
        JSON.stringify({ error: 'الحجز غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من وجود عقد نشط
    if (!reservation.contract_issued || !reservation.contract_number) {
      return new Response(
        JSON.stringify({ error: 'يجب إصدار العقد أولاً' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من عدم إصدار شهادة مسبقاً
    const { data: existingCert } = await supabase
      .from('b2f_certificates')
      .select('id, certificate_number')
      .eq('reservation_id', reservationId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingCert) {
      return new Response(
        JSON.stringify({
          error: 'تم إصدار شهادة لهذا الحجز مسبقاً',
          certificateNumber: existingCert.certificate_number
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // توليد رقم الشهادة
    const { data: certNumber } = await supabase.rpc('generate_b2f_certificate_number');

    // حساب تاريخ الانتهاء
    const contractDuration = reservation.b2f_opportunities?.contract_duration_years || 10;
    const issueDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + contractDuration);

    // إنشاء بيانات QR Code
    const qrData = JSON.stringify({
      certNumber: certNumber || 'CERT-2025-000001',
      issueDate: issueDate.toISOString(),
      investorName: reservation.investor_name || reservation.customer_name,
      farmName: reservation.b2f_opportunities?.b2f_farms?.name || 'غير محدد',
      treeCount: reservation.number_of_trees,
      verifyUrl: `${supabaseUrl}/verify-certificate/${certNumber}`
    });

    // إدراج الشهادة
    const { data: certificate, error: certError } = await supabase
      .from('b2f_certificates')
      .insert({
        reservation_id: reservationId,
        certificate_number: certNumber || 'CERT-2025-000001',
        investor_name: reservation.investor_name || reservation.customer_name,
        investor_phone: reservation.customer_phone,
        investor_id: reservation.user_id,
        farm_name: reservation.b2f_opportunities?.b2f_farms?.name || 'غير محدد',
        opportunity_title: reservation.b2f_opportunities?.title || 'غير محدد',
        tree_type: reservation.b2f_opportunities?.tree_type || 'غير محدد',
        tree_count: reservation.number_of_trees,
        total_amount: reservation.total_amount,
        contract_duration_years: contractDuration,
        issued_date: issueDate.toISOString().split('T')[0],
        start_date: issueDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        qr_code_data: qrData,
        is_active: true,
        status: 'active'
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

    // تحديث الحجز
    await supabase
      .from('investment_reservations')
      .update({
        certificate_id: certificate.id,
        certificate_number: certificate.certificate_number,
        certificate_issued: true,
        certificate_issued_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    // تسجيل الحدث
    await supabase
      .from('certificate_issuance_log')
      .insert({
        certificate_id: certificate.id,
        event_type: 'issued',
        event_details: `تم إصدار الشهادة رقم ${certificate.certificate_number}`,
        success: true
      });

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificate_number,
          issueDate: certificate.issued_date,
          endDate: certificate.end_date,
          qrCodeData: certificate.qr_code_data
        },
        message: 'تم إصدار الشهادة بنجاح'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-b2f-certificate:', error);
    return new Response(
      JSON.stringify({
        error: 'حدث خطأ أثناء إصدار الشهادة',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
