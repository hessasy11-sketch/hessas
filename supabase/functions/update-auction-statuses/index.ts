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

    const now = new Date().toISOString();
    let updatedCount = 0;

    // 1. تحديث المزادات المنتهية (من active/upcoming/extended إلى completed)
    const { data: expiredAuctions, error: expiredError } = await supabase
      .from("auctions")
      .select("id, title")
      .in("status", ["active", "upcoming", "extended"])
      .lt("ends_at", now);

    if (expiredError) throw expiredError;

    if (expiredAuctions && expiredAuctions.length > 0) {
      const { error: updateError } = await supabase
        .from("auctions")
        .update({ status: "completed", updated_at: now })
        .in("id", expiredAuctions.map(a => a.id));

      if (updateError) throw updateError;
      updatedCount += expiredAuctions.length;

      console.log(`✅ تم إغلاق ${expiredAuctions.length} مزادات منتهية`);
    }

    // 2. تحديث المزادات القادمة إلى نشطة (من upcoming إلى active)
    const { data: upcomingAuctions, error: upcomingError } = await supabase
      .from("auctions")
      .select("id, title")
      .eq("status", "upcoming")
      .lte("starts_at", now)
      .gt("ends_at", now);

    if (upcomingError) throw upcomingError;

    if (upcomingAuctions && upcomingAuctions.length > 0) {
      const { error: activateError } = await supabase
        .from("auctions")
        .update({ status: "active", updated_at: now })
        .in("id", upcomingAuctions.map(a => a.id));

      if (activateError) throw activateError;
      updatedCount += upcomingAuctions.length;

      console.log(`✅ تم تفعيل ${upcomingAuctions.length} مزادات قادمة`);
    }

    // 3. تحديث حالة المزادات القريبة من الانتهاء
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    
    const { data: closingSoonAuctions, error: closingSoonError } = await supabase
      .from("auctions")
      .select("id")
      .eq("status", "active")
      .lt("ends_at", twoHoursFromNow)
      .gt("ends_at", now);

    if (closingSoonError) throw closingSoonError;

    const closingSoonCount = closingSoonAuctions?.length || 0;

    const result = {
      success: true,
      timestamp: now,
      updated: {
        closed: expiredAuctions?.length || 0,
        activated: upcomingAuctions?.length || 0,
        closing_soon: closingSoonCount,
        total: updatedCount
      },
      message: `تم تحديث ${updatedCount} مزاد بنجاح`
    };

    console.log("📊 نتيجة التحديث:", result);

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("❌ خطأ في تحديث حالة المزادات:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
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
