import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisRequest {
  salesRequestId: string;
  documentUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[AI-PAYMENT] بدء معالجة الطلب');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('متغيرات البيئة غير متوفرة');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[AI-PAYMENT] تم إنشاء Supabase client');

    const requestData = await req.json();
    console.log('[AI-PAYMENT] البيانات المستلمة:', JSON.stringify(requestData));

    const { salesRequestId, documentUrl } = requestData as AnalysisRequest;

    if (!salesRequestId) {
      throw new Error('معرف الطلب مطلوب');
    }

    if (!documentUrl) {
      throw new Error('رابط المستند مطلوب');
    }

    console.log(`[AI-PAYMENT] بدء تحليل المستند للطلب: ${salesRequestId}`);

    const { data: request, error: fetchError } = await supabase
      .from('b2f_sales_requests')
      .select('*')
      .eq('id', salesRequestId)
      .maybeSingle();

    if (fetchError) {
      console.error('[AI-PAYMENT] خطأ في جلب الطلب:', fetchError);
      throw new Error(`خطأ في جلب الطلب: ${fetchError.message}`);
    }

    if (!request) {
      throw new Error('لم يتم العثور على الطلب');
    }

    const expected_amount = request.total_amount;
    console.log(`[AI-PAYMENT] المبلغ المطلوب: ${expected_amount}`);

    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    const hasValidExtension = validExtensions.some(ext => documentUrl.toLowerCase().includes(ext));

    if (!hasValidExtension) {
      const { error: updateError } = await supabase
        .from('b2f_sales_requests')
        .update({
          status: 'receipt_rejected',
          ai_verification_status: 'rejected',
          ai_analysis_result: {
            document_type: 'invalid',
            rejection_reason: 'نوع الملف غير مدعوم',
            ai_decision: 'auto_rejected',
            ai_analysis_notes: 'نوع الملف غير مدعوم - يجب رفع صورة أو PDF',
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', salesRequestId);

      if (updateError) {
        console.error('[AI-PAYMENT] خطأ في التحديث:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          decision: 'auto_rejected',
          message: 'نوع الملف غير مدعوم - يجب رفع صورة أو PDF',
          new_status: 'receipt_rejected'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const ai_analysis_notes = `تم استلام إثبات الدفع بنجاح\n\nالمبلغ المطلوب: ${expected_amount.toLocaleString('ar-SA')} ريال\n\nهذا المستند يحتاج مراجعة يدوية من فريق المالية للتحقق من:\n- أن المستند إيصال تحويل بنكي وليس فاتورة\n- مطابقة المبلغ المحول مع المبلغ المطلوب (${expected_amount.toLocaleString('ar-SA')} ريال)\n- صحة بيانات التحويل\n\nسيتم إشعارك بنتيجة المراجعة`;

    const { error: updateError } = await supabase
      .from('b2f_sales_requests')
      .update({
        status: 'receipt_under_review',
        ai_verification_status: 'needs_review',
        ai_analysis_result: {
          document_type: 'pending_review',
          expected_amount: expected_amount,
          ai_decision: 'needs_review',
          ai_analysis_notes: ai_analysis_notes,
          timestamp: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', salesRequestId);

    if (updateError) {
      console.error('[AI-PAYMENT] خطأ في التحديث:', updateError);
      throw updateError;
    }

    console.log(`[AI-PAYMENT] تم إرسال المستند للمراجعة اليدوية`);

    return new Response(
      JSON.stringify({
        success: true,
        decision: 'needs_review',
        message: ai_analysis_notes,
        new_status: 'receipt_under_review'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AI-PAYMENT] خطأ:', errorMessage);
    console.error('[AI-PAYMENT] تفاصيل الخطأ:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
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