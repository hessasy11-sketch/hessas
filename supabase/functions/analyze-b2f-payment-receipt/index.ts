import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisRequest {
  request_id: string;
  receipt_url: string;
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

    const { request_id, receipt_url }: AnalysisRequest = await req.json();

    console.log(`[AI-RECEIPT] بدء التحقق من الإيصال للطلب: ${request_id}`);
    console.log(`[AI-RECEIPT] رابط الإيصال: ${receipt_url}`);

    const { data: requestData, error: fetchError } = await supabase
      .from('b2f_sales_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError) throw fetchError;

    const expectedAmount = requestData.total_amount;
    console.log(`[AI-RECEIPT] المبلغ المطلوب: ${expectedAmount} ر.س`);

    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    const hasValidExtension = validExtensions.some(ext => receipt_url.toLowerCase().includes(ext));

    if (!hasValidExtension) {
      const updateData = {
        status: 'receipt_rejected',
        ai_verification_status: 'rejected',
        ai_verification_notes: `مرفوض - نوع الملف غير مدعوم\n\nيجب رفع صورة (JPG, PNG, WEBP) أو ملف PDF`,
        rejection_reason: 'نوع الملف غير مدعوم',
        requires_manual_review: false,
        ai_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('b2f_sales_requests')
        .update(updateData)
        .eq('id', request_id);

      return new Response(
        JSON.stringify({
          success: true,
          verification_status: 'rejected',
          requires_manual_review: false,
          rejection_reason: 'نوع الملف غير مدعوم',
          ai_notes: 'يجب رفع صورة أو PDF'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const aiNotes = `تم استلام الإيصال بنجاح\n\nالمبلغ المطلوب: ${expectedAmount.toLocaleString('ar-SA')} ريال\n\nهذا الإيصال يحتاج مراجعة يدوية من فريق المالية للتحقق من:\n- صحة الإيصال\n- مطابقة المبلغ المحول مع المبلغ المطلوب\n- التأكد من بيانات التحويل\n\nسيتم إشعارك بنتيجة المراجعة`;

    const updateData = {
      status: 'receipt_under_review',
      ai_verification_status: 'needs_review',
      ai_verification_notes: aiNotes,
      requires_manual_review: true,
      expected_amount: expectedAmount,
      ai_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('b2f_sales_requests')
      .update(updateData)
      .eq('id', request_id);

    if (updateError) throw updateError;

    console.log(`[AI-RECEIPT] تم إرسال الإيصال للمراجعة اليدوية`);

    return new Response(
      JSON.stringify({
        success: true,
        verification_status: 'needs_review',
        requires_manual_review: true,
        rejection_reason: null,
        ai_notes: aiNotes
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-RECEIPT] خطأ:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
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