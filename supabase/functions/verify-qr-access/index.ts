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
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { qr_token }: VerifyRequest = await req.json();

    console.log('🔍 Received QR token:', qr_token);

    if (!qr_token || qr_token.trim() === '') {
      console.error('❌ Missing or empty QR token');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'رمز QR غير صالح',
          reason: 'missing_token',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📞 Calling verify_qr_access function...');
    const { data, error } = await supabase.rpc('verify_qr_access', {
      p_qr_token: qr_token,
    });

    if (error) {
      console.error('❌ Error from RPC:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'خطأ في التحقق من الصلاحية',
          reason: 'verification_error',
          error: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ RPC result:', JSON.stringify(data, null, 2));

    const verificationResult = data as {
      success: boolean;
      message: string;
      reason?: string;
      staff?: any;
      requires_pin?: boolean;
      landing_route?: string;
      default_route?: string;
    };

    const statusCode = verificationResult.success ? 200 : 403;

    console.log('🚀 Returning result with status:', statusCode);
    console.log('  Success:', verificationResult.success);
    console.log('  Requires PIN:', verificationResult.requires_pin);
    console.log('  Landing route:', verificationResult.landing_route);

    return new Response(JSON.stringify(verificationResult), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ غير متوقع',
        reason: 'server_error',
        error: String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
