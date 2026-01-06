import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GMLoginRequest {
  phone: string;
  password: string;
}

interface GMLoginResponse {
  success: boolean;
  message: string;
  data?: {
    staffId: string;
    fullName: string;
    role: string;
    scopeType: string;
    staffCode: string;
    landingRoute: string;
  };
  reason?: string;
}

// Simple hash function using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    const { phone, password }: GMLoginRequest = await req.json();

    console.log('[GM Login] Attempt:', { phone });

    // Validate input
    if (!phone || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'الرجاء إدخال رقم الجوال وكلمة المرور',
          reason: 'missing_data',
        } as GMLoginResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate phone format (Saudi format)
    const phoneRegex = /^(05|5)\d{8}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'رقم الجوال غير صحيح',
          reason: 'invalid_phone',
        } as GMLoginResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\s+/g, '');

    console.log('[GM Login] Verifying credentials for:', normalizedPhone);

    // Verify GM credentials from database
    const { data: gmData, error: gmError } = await supabase.rpc('verify_gm_credentials', {
      p_phone: normalizedPhone,
    });

    console.log('[GM Login] RPC Result:', { gmData, gmError });

    if (gmError) {
      console.error('[GM Login] RPC Error:', gmError);

      // Log failed attempt
      await supabase.from('gm_login_logs').insert({
        phone_number: normalizedPhone,
        login_status: 'failed',
        failure_reason: 'database_error',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'حدث خطأ في التحقق من البيانات',
          reason: 'database_error',
        } as GMLoginResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!gmData || gmData.length === 0) {
      // Log failed attempt
      await supabase.from('gm_login_logs').insert({
        phone_number: normalizedPhone,
        login_status: 'failed',
        failure_reason: 'invalid_credentials',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'رقم الجوال أو كلمة المرور غير صحيحة',
          reason: 'invalid_credentials',
        } as GMLoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const gm = gmData[0];

    console.log('[GM Login] Found GM:', {
      staff_id: gm.staff_id,
      full_name: gm.full_name,
      has_password: !!gm.password_hash
    });

    // Check if password is still placeholder (first-time login)
    const isFirstLogin = gm.password_hash === '$2a$10$placeholder';

    console.log('[GM Login] First login check:', { isFirstLogin });

    let passwordValid = false;

    if (isFirstLogin) {
      // First-time login: check if password is the default "GM@2026"
      console.log('[GM Login] First-time login - checking default password');

      if (password === 'GM@2026') {
        console.log('[GM Login] Default password correct - hashing...');
        passwordValid = true;

        // Hash the password and update it
        const hashedPassword = await hashPassword(password);

        console.log('[GM Login] Updating password hash...');

        const { error: updateError } = await supabase.rpc('update_gm_password_hash', {
          p_staff_id: gm.staff_id,
          p_password_hash: hashedPassword,
        });

        if (updateError) {
          console.error('[GM Login] Failed to update password:', updateError);
        } else {
          console.log('[GM Login] Password hash updated successfully');
        }
      } else {
        console.log('[GM Login] Wrong default password');
      }
    } else {
      // Regular login: verify hashed password
      console.log('[GM Login] Regular login - verifying hash');

      const hashedInput = await hashPassword(password);
      passwordValid = hashedInput === gm.password_hash;

      console.log('[GM Login] Password verification:', { passwordValid });
    }

    if (!passwordValid) {
      console.log('[GM Login] Password validation failed');

      // Log failed attempt
      await supabase.from('gm_login_logs').insert({
        staff_id: gm.staff_id,
        phone_number: normalizedPhone,
        login_status: 'failed',
        failure_reason: 'wrong_password',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'كلمة المرور غير صحيحة',
          reason: 'wrong_password',
        } as GMLoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[GM Login] Login successful');

    // Update last login time
    await supabase
      .from('platform_staff')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', gm.staff_id);

    // Log successful login
    await supabase.from('gm_login_logs').insert({
      staff_id: gm.staff_id,
      phone_number: normalizedPhone,
      login_status: 'success',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

    // Return success with session data
    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        data: {
          staffId: gm.staff_id,
          fullName: gm.full_name,
          role: gm.role,
          scopeType: gm.scope_type,
          staffCode: gm.staff_code,
          landingRoute: '/hq', // GM always lands on HQ dashboard
        },
      } as GMLoginResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[GM Login] Unexpected Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ في تسجيل الدخول',
        reason: 'server_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as GMLoginResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
