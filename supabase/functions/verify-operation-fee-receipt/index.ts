import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerificationRequest {
  feeId: string;
  receiptUrl: string;
  expectedAmount: number;
  investorPhone: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { feeId, receiptUrl, expectedAmount, investorPhone }: VerificationRequest = await req.json();

    console.log('Verifying operation fee receipt:', { feeId, expectedAmount, investorPhone });

    // تحديث حالة الرسوم إلى "تحت المراجعة"
    await supabase
      .from('investor_operation_fees')
      .update({
        status: 'under_review',
        receipt_url: receiptUrl,
        ai_verification_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', feeId);

    // تحليل الإيصال باستخدام AI (محاكاة)
    const aiResult = await analyzeReceipt(receiptUrl, expectedAmount);

    // تحديث نتيجة التحقق
    const updateData: any = {
      ai_verified_amount: aiResult.detectedAmount,
      ai_verification_status: aiResult.status,
      ai_verification_notes: aiResult.notes,
      updated_at: new Date().toISOString()
    };

    // إذا كان المبلغ مطابق، تحديث الحالة إلى "مدفوع"
    if (aiResult.status === 'verified') {
      updateData.status = 'paid';
      updateData.paid_at = new Date().toISOString();
    } else if (aiResult.status === 'mismatch') {
      updateData.status = 'under_review';
    } else {
      updateData.status = 'pending_payment';
    }

    await supabase
      .from('investor_operation_fees')
      .update(updateData)
      .eq('id', feeId);

    // إنشاء إشعار للمستثمر
    const notificationMessage = aiResult.status === 'verified'
      ? `تم قبول إيصال رسوم التشغيل بمبلغ ${aiResult.detectedAmount} ريال`
      : aiResult.status === 'mismatch'
      ? `المبلغ في الإيصال (${aiResult.detectedAmount} ريال) لا يطابق المبلغ المطلوب (${expectedAmount} ريال)`
      : 'فشل التحقق من الإيصال، يرجى المحاولة مرة أخرى';

    await supabase.from('notifications').insert({
      user_id: investorPhone,
      title: aiResult.status === 'verified' ? 'تم قبول الإيصال' : 'مراجعة الإيصال',
      message: notificationMessage,
      type: 'payment',
      related_id: feeId
    });

    return new Response(
      JSON.stringify({
        success: true,
        verification: aiResult,
        message: notificationMessage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error verifying receipt:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function analyzeReceipt(receiptUrl: string, expectedAmount: number) {
  // محاكاة تحليل AI للإيصال
  // في الإنتاج، هنا نستخدم OpenAI Vision API أو Google Cloud Vision
  
  console.log('Analyzing receipt with AI:', receiptUrl);
  
  // محاكاة: نفترض أن الإيصال صحيح في 90% من الحالات
  const random = Math.random();
  
  if (random > 0.9) {
    // 10% حالة فشل
    return {
      status: 'failed',
      detectedAmount: 0,
      notes: 'فشل قراءة الإيصال، يرجى رفع صورة واضحة'
    };
  } else if (random > 0.7) {
    // 20% عدم تطابق
    const detectedAmount = expectedAmount * (0.8 + Math.random() * 0.3);
    return {
      status: 'mismatch',
      detectedAmount: Math.round(detectedAmount * 100) / 100,
      notes: `المبلغ المكتشف (${Math.round(detectedAmount * 100) / 100} ريال) لا يطابق المبلغ المطلوب (${expectedAmount} ريال)`
    };
  } else {
    // 70% نجاح
    return {
      status: 'verified',
      detectedAmount: expectedAmount,
      notes: `تم التحقق من المبلغ بنجاح: ${expectedAmount} ريال`
    };
  }
}
