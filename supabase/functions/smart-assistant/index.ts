import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatRequest {
  sessionId?: string;
  message: string;
  category?: string;
}

function generateSmartResponse(question: string, faqResults: any[]): string {
  if (faqResults.length > 0) {
    const best = faqResults[0];
    return `${best.icon} ${best.answer}`;
  }

  const greetings = ['مرحبا', 'السلام', 'هلا', 'اهلين', 'صباح', 'مساء'];
  const isGreeting = greetings.some(g => question.includes(g));
  
  if (isGreeting) {
    return '👋 يا هلا فيك في مركز المساعدة الزراعي! 🌾\n\nأنا هنا لمساعدتك في:\n🪴 طريقة نشر المزادات\n💰 الدفع والعمولات\n🧾 تتبع الإيصالات\n\nوش اللي تحتاج مساعدة فيه؟';
  }

  const keywords = {
    'نشر': '🪴 لنشر مزاد زراعي، افتح القائمة واضغط زر "+" الأخضر، واملأ البيانات. سهلة! 🌿',
    'دفع': '💰 نظام الدفع بسيط: المشتري يدفع كامل، والمنصة تاخذ 5% عمولة، والباقي لك خلال 24 ساعة.',
    'إيصال': '🧾 ارفع صورة الإيصال من "الاشتراكات الذكية" والذكاء المحدود راح يحللها تلقائياً!',
    'محفظة': '💼 افتح "محفظتي الزراعية" من القائمة لمشاهدة رصيدك والعمليات.',
    'سحب': '🏦 لسحب الأرباح، افتح المحفظة واضغط "سحب رصيد" وأدخل بيانات حسابك.',
    'اشتراك': '✨ افتح "الاشتراكات الذكية" واختر الباقة المناسبة لك (مجانية، زراعية، ذهبية).',
  };

  for (const [keyword, response] of Object.entries(keywords)) {
    if (question.includes(keyword)) {
      return response;
    }
  }

  return '🤔 آسف، ما فهمت سؤالك بالضبط.\n\nممكن تكتبه بطريقة ثانية؟ أو اضغط زر "تحويل لواتساب" لمساعدة مباشرة من فريقنا! 📞';
}

serve(async (req: Request) => {
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { sessionId, message, category }: ChatRequest = await req.json();

    let currentSessionId = sessionId;

    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('support_sessions')
        .insert({
          user_id: user.id,
          category: category || 'general',
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      currentSessionId = newSession.id;
    }

    const { error: userMessageError } = await supabase
      .from('support_messages')
      .insert({
        session_id: currentSessionId,
        sender_type: 'user',
        message: message
      });

    if (userMessageError) throw userMessageError;

    const { data: faqResults } = await supabase
      .rpc('search_faq', { search_term: message });

    const aiResponse = generateSmartResponse(message, faqResults || []);

    const { error: aiMessageError } = await supabase
      .from('support_messages')
      .insert({
        session_id: currentSessionId,
        sender_type: 'ai',
        message: aiResponse,
        metadata: {
          faq_matches: faqResults?.length || 0
        }
      });

    if (aiMessageError) throw aiMessageError;

    if (!faqResults || faqResults.length === 0) {
      await supabase
        .from('unanswered_questions')
        .insert({
          user_id: user.id,
          question: message,
          context: category || 'general'
        })
        .then(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: currentSessionId,
        response: aiResponse,
        suggestions: faqResults?.slice(0, 3).map(f => ({
          question: f.question,
          icon: f.icon
        })) || []
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in smart assistant:', error);
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