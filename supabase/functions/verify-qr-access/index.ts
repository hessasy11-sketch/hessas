import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyRequest {
  qr_token: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { qr_token }: VerifyRequest = await req.json();

    console.log('===========================================');
    console.log('QR VERIFICATION REQUEST');
    console.log('Token:', qr_token);
    console.log('===========================================');

    if (!qr_token || qr_token.trim() === '') {
      console.error('ERROR: Empty token');
      return new Response(
        JSON.stringify({ success: false, message: 'رمز QR غير صالح', reason: 'missing_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling verify_qr_access RPC...');
    const { data, error } = await supabase.rpc('verify_qr_access', { p_qr_token: qr_token });

    if (error) {
      console.error('RPC ERROR:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'خطأ في التحقق', reason: 'rpc_error', error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('RPC SUCCESS:', JSON.stringify(data, null, 2));
    console.log('===========================================');

    const result = data as any;
    const statusCode = result.success ? 200 : 403;

    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('EXCEPTION:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'حدث خطأ غير متوقع', reason: 'exception', error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
