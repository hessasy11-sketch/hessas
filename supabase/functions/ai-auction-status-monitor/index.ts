import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AuctionAnalysis {
  auctionId: string;
  currentStatus: string;
  viewsCount: number;
  biddersCount: number;
  messagesCount: number;
  lastActivityAt: string;
  endsAt: string;
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

    const { auctionId }: { auctionId?: string } = await req.json().catch(() => ({}));

    if (auctionId) {
      const result = await analyzeAuction(supabase, auctionId);
      return new Response(
        JSON.stringify(result),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      const { data: activeAuctions } = await supabase
        .from('auctions')
        .select('id')
        .eq('status', 'active')
        .lt('ends_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      const results = [];
      if (activeAuctions) {
        for (const auction of activeAuctions.slice(0, 10)) {
          const result = await analyzeAuction(supabase, auction.id);
          results.push(result);
        }
      }

      return new Response(
        JSON.stringify({ success: true, analyzed: results.length, results }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error:', error);
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

async function analyzeAuction(supabase: any, auctionId: string) {
  const { data: auction } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (!auction) {
    return { success: false, auctionId, error: 'Auction not found' };
  }

  const analysis: AuctionAnalysis = {
    auctionId,
    currentStatus: auction.status,
    viewsCount: auction.views_count || 0,
    biddersCount: auction.bidders_count || 0,
    messagesCount: auction.messages_count || 0,
    lastActivityAt: auction.last_activity_at || auction.created_at,
    endsAt: auction.ends_at,
  };

  const recommendation = getStatusRecommendation(analysis);

  if (recommendation.shouldUpdate && recommendation.newStatus !== auction.status) {
    const { error: updateError } = await supabase.rpc(
      'ai_update_auction_status',
      {
        auction_uuid: auctionId,
        new_status_value: recommendation.newStatus,
        confidence_score: recommendation.confidence,
        analysis_data: recommendation.analysis,
        reason_text: recommendation.reason,
      }
    );

    if (updateError) {
      console.error('Update error:', updateError);
      return {
        success: false,
        auctionId,
        error: updateError.message,
      };
    }

    return {
      success: true,
      auctionId,
      updated: true,
      oldStatus: auction.status,
      newStatus: recommendation.newStatus,
      confidence: recommendation.confidence,
      reason: recommendation.reason,
    };
  }

  return {
    success: true,
    auctionId,
    updated: false,
    status: auction.status,
    reason: 'No status change needed',
  };
}

function getStatusRecommendation(analysis: AuctionAnalysis) {
  const now = new Date();
  const endsAt = new Date(analysis.endsAt);
  const timeLeft = endsAt.getTime() - now.getTime();
  const hoursLeft = timeLeft / (1000 * 60 * 60);

  const timeSinceActivity = analysis.lastActivityAt
    ? now.getTime() - new Date(analysis.lastActivityAt).getTime()
    : 0;
  const hoursSinceActivity = timeSinceActivity / (1000 * 60 * 60);

  if (hoursLeft <= 0) {
    return {
      shouldUpdate: false,
      newStatus: 'expired',
      confidence: 1.0,
      reason: 'المزاد انتهى',
      analysis: { hoursLeft, hoursSinceActivity, ...analysis },
    };
  }

  if (hoursLeft <= 2 && analysis.biddersCount >= 3) {
    return {
      shouldUpdate: true,
      newStatus: 'closing_soon',
      confidence: 0.95,
      reason: `المزاد سينتهي خلال ${hoursLeft.toFixed(1)} ساعة مع ${analysis.biddersCount} مزايدين نشطين`,
      analysis: { hoursLeft, hoursSinceActivity, ...analysis },
    };
  }

  if (analysis.viewsCount >= 50 && analysis.biddersCount >= 5 && hoursSinceActivity < 1) {
    return {
      shouldUpdate: true,
      newStatus: 'active',
      confidence: 0.92,
      reason: `نشاط عالي: ${analysis.viewsCount} مشاهدة، ${analysis.biddersCount} مزايد، آخر نشاط قبل ${hoursSinceActivity.toFixed(1)} ساعة`,
      analysis: { hoursLeft, hoursSinceActivity, ...analysis },
    };
  }

  if (hoursSinceActivity > 12 && analysis.biddersCount < 2) {
    return {
      shouldUpdate: false,
      newStatus: 'low_activity',
      confidence: 0.75,
      reason: `نشاط منخفض: آخر نشاط قبل ${hoursSinceActivity.toFixed(1)} ساعة`,
      analysis: { hoursLeft, hoursSinceActivity, ...analysis },
    };
  }

  return {
    shouldUpdate: false,
    newStatus: analysis.currentStatus,
    confidence: 0.85,
    reason: 'الحالة الحالية مناسبة',
    analysis: { hoursLeft, hoursSinceActivity, ...analysis },
  };
}
