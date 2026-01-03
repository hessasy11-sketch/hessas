import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // فحص التجارب المنتهية
    const { data: result, error } = await supabase.rpc('check_expired_trials');

    if (error) {
      console.error('خطأ في فحص التجارب المنتهية:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`تم فحص التجارب المنتهية: ${result.expired_count} تجربة منتهية`);

    // إرسال تنبيهات قبل الانتهاء (48 ساعة)
    const { data: expiringSoon } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        ends_at,
        is_trial,
        profiles!user_subscriptions_user_id_fkey(full_name),
        subscription_plans!user_subscriptions_plan_id_fkey(name_ar)
      `)
      .eq('status', 'active')
      .eq('is_trial', true)
      .gte('ends_at', new Date().toISOString())
      .lte('ends_at', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString())
      .is('reminder_48h_sent', null);

    if (expiringSoon && expiringSoon.length > 0) {
      for (const sub of expiringSoon) {
        const daysLeft = Math.ceil((new Date(sub.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        // إرسال إشعار
        await supabase.from('notifications').insert({
          user_id: sub.user_id,
          type: 'trial_expiring_soon',
          title: '⚠️ تجربتك المجانية قريبة من الانتهاء!',
          message: `تبقى ${daysLeft} يوم فقط على انتهاء تجربتك المجانية. اشترك الآن للاستمرار في الاستفادة من جميع المزايا!`,
          is_read: false,
        });

        // تحديث حالة التذكير
        await supabase
          .from('user_subscriptions')
          .update({ reminder_48h_sent: new Date().toISOString() })
          .eq('id', sub.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: result.expired_count,
        reminders_sent: expiringSoon?.length || 0,
        message: result.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('خطأ عام:', error);

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