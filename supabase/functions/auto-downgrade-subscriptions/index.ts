import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ExpiredSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  plan_price: string;
  ends_at: string;
  status: string;
}

Deno.serve(async (req: Request) => {
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

    console.log('Starting auto-downgrade check...');

    const { data: expiredSubs, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        ends_at,
        status,
        subscription_plans!plan_id (
          name,
          price
        )
      `)
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())
      .gt('subscription_plans.price', '0');

    if (fetchError) throw fetchError;

    if (!expiredSubs || expiredSubs.length === 0) {
      console.log('No expired subscriptions found.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expired subscriptions to process',
          processed: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`Found ${expiredSubs.length} expired subscriptions`);

    const { data: freePlan, error: freePlanError } = await supabase
      .from('subscription_plans')
      .select('id, name')
      .eq('price', '0')
      .limit(1)
      .maybeSingle();

    if (freePlanError || !freePlan) {
      throw new Error('Free plan not found');
    }

    const processed: string[] = [];
    const failed: string[] = [];

    for (const sub of expiredSubs) {
      try {
        const expiredSub: ExpiredSubscription = {
          id: sub.id,
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          plan_name: (sub.subscription_plans as any)?.name || 'Unknown',
          plan_price: (sub.subscription_plans as any)?.price || '0',
          ends_at: sub.ends_at,
          status: sub.status,
        };

        console.log(`Processing subscription ${expiredSub.id} for user ${expiredSub.user_id}`);

        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'expired',
            auto_downgraded: true,
            downgraded_at: new Date().toISOString(),
          })
          .eq('id', expiredSub.id);

        if (updateError) throw updateError;

        const newStartDate = new Date();
        const newEndDate = new Date();
        newEndDate.setFullYear(newEndDate.getFullYear() + 10);

        const { error: newSubError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: expiredSub.user_id,
            plan_id: freePlan.id,
            status: 'active',
            starts_at: newStartDate.toISOString(),
            ends_at: newEndDate.toISOString(),
            auto_renew: true,
          });

        if (newSubError) throw newSubError;

        const disabledFeatures = {
          premium_auctions: false,
          priority_support: false,
          advanced_analytics: false,
          unlimited_listings: false,
          custom_branding: false,
        };

        const { error: logError } = await supabase
          .from('subscription_downgrade_logs')
          .insert({
            user_id: expiredSub.user_id,
            old_subscription_id: expiredSub.id,
            old_plan_name: expiredSub.plan_name,
            old_plan_price: parseFloat(expiredSub.plan_price),
            new_plan_id: freePlan.id,
            new_plan_name: freePlan.name,
            downgrade_reason: 'subscription_expired',
            downgrade_date: new Date().toISOString(),
            features_disabled: disabledFeatures,
            ai_notification_sent: false,
          });

        if (logError) throw logError;

        const aiMessage = generateAIMessage(expiredSub.plan_name, freePlan.name);

        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: expiredSub.user_id,
          type: 'subscription_downgraded',
          title: 'تم تحويل باقتك للمجانية',
          message: aiMessage,
          action_url: '/subscriptions',
          is_read: false,
        });

        if (notifError) {
          console.error(`Failed to send notification for user ${expiredSub.user_id}:`, notifError);
        } else {
          await supabase
            .from('subscription_downgrade_logs')
            .update({ ai_notification_sent: true })
            .eq('user_id', expiredSub.user_id)
            .eq('old_subscription_id', expiredSub.id);
        }

        processed.push(expiredSub.id);
        console.log(`Successfully processed subscription ${expiredSub.id}`);
      } catch (error) {
        console.error(`Failed to process subscription ${sub.id}:`, error);
        failed.push(sub.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed.length} subscriptions`,
        processed: processed.length,
        failed: failed.length,
        details: {
          processed,
          failed,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in auto-downgrade:', error);
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

function generateAIMessage(oldPlanName: string, newPlanName: string): string {
  return `مرحباً!

لاحظت أن باقتك ${oldPlanName} قد انتهت.

تم تحويلك تلقائياً إلى ${newPlanName} مع الميزات الأساسية.

للعودة للاستفادة من جميع المميزات المتقدمة، يمكنك تجديد اشتراكك في أي وقت.

نحن هنا لمساعدتك! 😊`;
}
