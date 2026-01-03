import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    const { auctionId } = await req.json();

    if (!auctionId) {
      return new Response(
        JSON.stringify({ error: "auctionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // جلب بيانات المزاد
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select(`
        id,
        title,
        current_price,
        owner_id,
        seller_plan_type,
        category_id,
        profiles!auctions_owner_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq("id", auctionId)
      .eq("status", "sold")
      .single();

    if (auctionError || !auction) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على المزاد" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sellerName = auction.profiles?.full_name || "البائع";
    const planType = auction.seller_plan_type || "free";

    // 1. إرسال إشعار تهنئة
    const congratsMessage = `🎉 مبروك ${sellerName}! تم بيع مزادك "${auction.title}" بنجاح بقيمة ${auction.current_price.toLocaleString('ar-SA')} ر.س`;
    
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: auction.owner_id,
        type: "auction_sold",
        title: "🎉 تم بيع مزادك!",
        message: congratsMessage,
        auction_id: auction.id,
        is_read: false,
      });

    if (notifError) {
      console.error("خطأ في إرسال إشعار التهنئة:", notifError);
    }

    // 2. اقتراح إعادة نشر (للفضي والذهبي فقط)
    if (planType === "silver" || planType === "gold") {
      const repostMessage = planType === "gold"
        ? `🤖 هل ترغب في نشر مزاد مشابه لـ "${auction.title}"? يمكن للمساعد الذكي مساعدتنا!`
        : `✨ هل ترغب في نشر مزاد جديد مشابه لـ "${auction.title}"?`;

      const { error: repostNotifError } = await supabase
        .from("notifications")
        .insert({
          user_id: auction.owner_id,
          type: "suggestion",
          title: planType === "gold" ? "🤖 اقتراح ذكي" : "✨ اقتراح",
          message: repostMessage,
          auction_id: auction.id,
          is_read: false,
        });

      if (repostNotifError) {
        console.error("خطأ في إرسال إشعار الاقتراح:", repostNotifError);
      }
    }

    // 3. تسجيل النشاط
    await supabase
      .from("activity_logs")
      .insert({
        user_id: auction.owner_id,
        action: "auction_sold",
        details: {
          auction_id: auction.id,
          title: auction.title,
          final_price: auction.current_price,
          plan_type: planType,
        },
      });

    // 4. تحديث المزاد (للتأكد من الترتيب)
    await supabase
      .from("auctions")
      .update({
        display_priority: 10,
        is_featured_eligible: false,
        sold_at: new Date().toISOString(),
      })
      .eq("id", auction.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم إرسال التهنئة والإشعارات بنجاح",
        auction: {
          id: auction.id,
          title: auction.title,
          seller: sellerName,
          plan: planType,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("خطأ في معالجة بيع المزاد:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});