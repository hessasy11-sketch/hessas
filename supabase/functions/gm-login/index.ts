import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

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

    // Verify GM credentials from database
    const { data: gmData, error: gmError } = await supabase.rpc('verify_gm_credentials', {
      p_phone: normalizedPhone,
    });

    if (gmError || !gmData || gmData.length === 0) {
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

    // Check if password is still placeholder (first-time login)
    const isFirstLogin = gm.password_hash === '$2a$10$placeholder';

    let passwordValid = false;

    if (isFirstLogin) {
      // First-time login: check if password is the default "GM@2026"
      if (password === 'GM@2026') {
        passwordValid = true;
        // Hash the password and update it
        const hashedPassword = await bcrypt.hash(password);
        await supabase.rpc('update_gm_password_hash', {
          p_staff_id: gm.staff_id,
          p_password_hash: hashedPassword,
        });
      }
    } else {
      // Regular login: verify hashed password
      passwordValid = await bcrypt.compare(password, gm.password_hash);
    }

    if (!passwordValid) {
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
    console.error('GM Login Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ في تسجيل الدخول',
        reason: 'server_error',
      } as GMLoginResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
