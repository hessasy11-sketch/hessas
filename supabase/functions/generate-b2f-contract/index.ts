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

    console.log(`[Contract] Generating contract PDF for ${contract_id}`);

    // جلب بيانات العقد
    const { data: contract, error: fetchError } = await supabase
      .from('b2f_contracts')
      .select('*')
      .eq('id', contract_id)
      .single();

    if (fetchError || !contract) {
      throw new Error('Contract not found');
    }

    // توليد رابط وثيقة العقد (HTML Page)
    const contractPdfUrl = `${supabaseUrl}/functions/v1/view-contract?id=${contract_id}`;

    // تحديث العقد بالرابط
    await supabase
      .from('b2f_contracts')
      .update({
        contract_pdf_url: contractPdfUrl
      })
      .eq('id', contract_id);

    console.log(`[Contract] Contract PDF generated: ${contractPdfUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        contract_pdf_url: contractPdfUrl,
        message: 'Contract PDF generated successfully'
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
