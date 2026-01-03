import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AnalysisRequest {
  transferId: string;
  receiptUrl: string;
  expectedAmount: number;
}

interface AnalysisResult {
  status: string;
  confidence: number;
  notes: string;
  extractedData: {
    amount?: number;
    date?: string;
    bankName?: string;
    hasLogo?: boolean;
    hasStamp?: boolean;
  };
}

function simulateSmartAnalysis(expectedAmount: number): AnalysisResult {
  const scenarios = [
    {
      status: 'matched',
      confidence: 98,
      notes: 'الإيصال مطابق تماماً. تم التعرف على المبلغ والتاريخ وشعار البنك.',
      extractedData: {
        amount: expectedAmount,
        date: new Date().toISOString().split('T')[0],
        bankName: 'الراجحي',
        hasLogo: true,
        hasStamp: true,
      },
    },
    {
      status: 'warning',
      confidence: 75,
      notes: 'تاريخ التحويل يختلف بيوم واحد عن التاريخ المتوقع. يُنصح بالمراجعة.',
      extractedData: {
        amount: expectedAmount,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        bankName: 'الراجحي',
        hasLogo: true,
        hasStamp: true,
      },
    },
    {
      status: 'warning',
      confidence: 65,
      notes: 'المبلغ يختلف قليلاً (فرق 5 ريال). قد تكون رسوم تحويل.',
      extractedData: {
        amount: expectedAmount - 5,
        date: new Date().toISOString().split('T')[0],
        bankName: 'الراجحي',
        hasLogo: true,
        hasStamp: false,
      },
    },
    {
      status: 'rejected',
      confidence: 30,
      notes: 'المبلغ غير مطابق بفارق كبير. الصورة غير واضحة.',
      extractedData: {
        amount: expectedAmount * 0.5,
        date: new Date().toISOString().split('T')[0],
        bankName: 'غير واضح',
        hasLogo: false,
        hasStamp: false,
      },
    },
  ];

  const randomIndex = Math.floor(Math.random() * scenarios.length);
  return scenarios[randomIndex];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transferId, receiptUrl, expectedAmount }: AnalysisRequest = await req.json();

    console.log(`Analyzing receipt for transfer ${transferId}`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysis = simulateSmartAnalysis(expectedAmount);

    const { error: updateError } = await supabase
      .from('bank_transfers')
      .update({
        ai_status: analysis.status,
        ai_confidence: analysis.confidence,
        ai_notes: analysis.notes,
        ai_extracted_data: analysis.extractedData,
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error analyzing receipt:', error);
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