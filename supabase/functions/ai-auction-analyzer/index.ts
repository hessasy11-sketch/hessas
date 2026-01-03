import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AuctionAnalysisRequest {
  auction_id: string;
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { auction_id } = await req.json() as AuctionAnalysisRequest;

    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auction_id)
      .single();

    if (auctionError || !auction) {
      throw new Error('Auction not found');
    }

    const now = new Date();
    const endsAt = new Date(auction.ends_at);
    const hoursRemaining = (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const viewsCount = auction.views_count || 0;
    const priceIncrease = ((auction.current_price - auction.starting_price) / auction.starting_price) * 100;

    const engagementScore = Math.min(100, (viewsCount / 10) * 100);
    const priceGrowthScore = Math.min(100, priceIncrease * 2);
    const timingScore = hoursRemaining > 24 ? 50 : hoursRemaining > 12 ? 75 : 90;

    const overallScore = (engagementScore + priceGrowthScore + timingScore) / 3;

    const insights = [];

    if (engagementScore > 70) {
      insights.push({
        auction_id,
        seller_id: auction.owner_id,
        insight_type: 'engagement',
        title_ar: 'تفاعل ممتاز على المزاد',
        message_ar: `المزاد يحقق ${Math.round(engagementScore)}% تفاعل أعلى من المتوسط. استمر في التفاعل مع المزايدين.`,
        confidence_score: Math.round(engagementScore),
        data: { views: viewsCount, score: engagementScore },
      });
    }

    if (hoursRemaining < 3 && hoursRemaining > 0) {
      insights.push({
        auction_id,
        seller_id: auction.owner_id,
        insight_type: 'timing',
        title_ar: 'أفضل وقت للتمديد',
        message_ar: `باقي ${Math.round(hoursRemaining)} ساعة. النشاط يزداد بين 7-9 مساءً. فكر في التمديد إذا كان السعر لم يصل للمتوقع.`,
        confidence_score: 85,
        data: { hours_remaining: hoursRemaining },
      });
    }

    if (priceIncrease > 20) {
      const expectedPrice = auction.current_price * 1.3;
      insights.push({
        auction_id,
        seller_id: auction.owner_id,
        insight_type: 'price',
        title_ar: 'توقع السعر النهائي',
        message_ar: `بناءً على التحليل، السعر المتوقع سيصل إلى ${Math.round(expectedPrice)} ر.س (زيادة ${Math.round(priceIncrease + 30)}% من السعر الحالي).`,
        confidence_score: 75,
        data: { expected_price: expectedPrice, current_increase: priceIncrease },
      });
    }

    if (overallScore > 70) {
      insights.push({
        auction_id,
        seller_id: auction.owner_id,
        insight_type: 'recommendation',
        title_ar: 'توصية ذكية',
        message_ar: 'أرسل رسالة تذكير للمتابعين قبل 2 ساعة من الانتهاء لزيادة المنافسة.',
        confidence_score: 90,
        data: { overall_score: overallScore },
      });
    }

    if (insights.length > 0) {
      await supabase.from('ai_auction_insights').insert(insights);
    }

    if (engagementScore < 30 && auction.seller_plan_type === 'free') {
      await supabase.from('auction_suggestions').insert({
        auction_id,
        seller_id: auction.owner_id,
        suggestion_type: 'upgrade',
        title_ar: 'حسّن أداء مزادك',
        message_ar: 'التفاعل منخفض. الباقة الفضية توفر لك أدوات التمديد والإعلانات لجذب المزيد من المزايدين.',
        action_type: 'upgrade_silver',
        priority: 'high',
      });
    }

    if (hoursRemaining < 2 && hoursRemaining > 0) {
      await supabase.from('auction_alerts').insert({
        auction_id,
        user_id: auction.owner_id,
        alert_type: 'ending_soon',
        title_ar: 'ينتهي المزاد قريباً',
        message_ar: `باقي ${Math.round(hoursRemaining * 60)} دقيقة على انتهاء المزاد. تأكد من متابعة المزايدات.`,
        severity: 'warning',
      });
    }

    await supabase.rpc('log_auction_activity', {
      p_auction_id: auction_id,
      p_user_id: auction.owner_id,
      p_activity_type: 'ai_analysis',
      p_activity_name_ar: 'تحليل ذكي تلقائي',
      p_description_ar: `تم تحليل المزاد بواسطة الذكاء الصناعي. النتيجة: ${Math.round(overallScore)}%`,
      p_metadata: {
        engagement_score: engagementScore,
        price_growth_score: priceGrowthScore,
        timing_score: timingScore,
        overall_score: overallScore,
        insights_generated: insights.length
      },
      p_is_ai_action: true,
      p_ai_confidence: overallScore,
      p_can_rollback: false
    });

    return new Response(
      JSON.stringify({
        success: true,
        insights_count: insights.length,
        overall_score: Math.round(overallScore),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error analyzing auction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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