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

    if (!qr_token || qr_token.trim() === '') {
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

    const { data, error } = await supabase.rpc('verify_qr_access', {
      p_qr_token: qr_token,
    });

    if (error) {
      console.error('Error verifying QR access:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'خطأ في التحقق من الصلاحية',
          reason: 'verification_error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const verificationResult = data as {
      success: boolean;
      message: string;
      reason?: string;
      staff?: any;
    };

    const statusCode = verificationResult.success ? 200 : 403;

    return new Response(JSON.stringify(verificationResult), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ غير متوقع',
        reason: 'server_error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
