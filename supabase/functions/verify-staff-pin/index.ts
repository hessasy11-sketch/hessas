import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyPinRequest {
  staff_id: string;
  pin_code: string;
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

    const { staff_id, pin_code }: VerifyPinRequest = await req.json();

    if (!staff_id || !pin_code) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'بيانات غير كاملة',
          reason: 'missing_data',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!/^\d{4}$/.test(pin_code)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'PIN يجب أن يكون 4 أرقام',
          reason: 'invalid_format',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data, error } = await supabase.rpc('verify_staff_pin', {
      p_staff_id: staff_id,
      p_pin_code: pin_code,
    });

    if (error) {
      console.error('Error verifying PIN:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'خطأ في التحقق من PIN',
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
      attempts_remaining?: number;
      locked_until?: string;
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
