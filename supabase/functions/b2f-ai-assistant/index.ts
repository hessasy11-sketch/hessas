import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  conversation_id?: string;
  investor_phone: string;
  message: string;
}

interface KnowledgeEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
}

// دالة للبحث في قاعدة المعرفة بناءً على السؤال
function findBestMatch(userQuestion: string, knowledgeBase: KnowledgeEntry[]): KnowledgeEntry | null {
  const userWords = userQuestion.toLowerCase().split(/\s+/);
  
  let bestMatch: { entry: KnowledgeEntry; score: number } | null = null;

  for (const entry of knowledgeBase) {
    let score = 0;

    // التحقق من مطابقة الكلمات المفتاحية
    for (const keyword of entry.keywords) {
      if (userQuestion.toLowerCase().includes(keyword.toLowerCase())) {
        score += 10;
      }
    }

    // التحقق من مطابقة كلمات السؤال نفسه
    for (const word of userWords) {
      if (word.length > 2) { // تجاهل الكلمات القصيرة جداً
        if (entry.question.toLowerCase().includes(word)) {
          score += 5;
        }
        if (entry.answer.toLowerCase().includes(word)) {
          score += 2;
        }
      }
    }

    // إضافة نقاط الأولوية
    score += entry.priority;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { entry, score };
    }
  }

  // إذا كان السكور أكبر من 15، نعتبرها مطابقة جيدة
  if (bestMatch && bestMatch.score >= 15) {
    return bestMatch.entry;
  }

  return null;
}

// دالة لتوليد رد تلقائي إذا لم يتم العثور على مطابقة
function generateDefaultResponse(userQuestion: string): string {
  const outOfScopeKeywords = ['مزاد', 'شركات', 'مزايدة', 'auction'];

  for (const keyword of outOfScopeKeywords) {
    if (userQuestion.toLowerCase().includes(keyword)) {
      return 'أنا هنا لمساعدتك فقط في استثمار أشجار المزارع. لباقي الأقسام مثل مزاد الشركات، يرجى التواصل مع الدعم أو استخدام القوائم الرئيسية.';
    }
  }

  // أسئلة شائعة يمكن الإجابة عليها مباشرة
  const commonQuestions: Record<string, string> = {
    'شكرا': 'العفو! سعيد بمساعدتك. إذا كان لديك أي أسئلة أخرى، أنا هنا دائماً 😊',
    'شكراً': 'العفو! سعيد بمساعدتك. إذا كان لديك أي أسئلة أخرى، أنا هنا دائماً 😊',
    'مرحبا': 'مرحباً بك! 🌳 كيف يمكنني مساعدتك في استثمار الأشجار اليوم؟',
    'السلام': 'وعليكم السلام ورحمة الله! 🌳 كيف يمكنني مساعدتك اليوم؟',
  };

  for (const [key, response] of Object.entries(commonQuestions)) {
    if (userQuestion.toLowerCase().includes(key)) {
      return response;
    }
  }

  return 'عذراً، لم أفهم سؤالك بشكل كامل. هل يمكنك إعادة صياغته بطريقة مختلفة؟\n\nيمكنك أن تسألني عن:\n• كيفية حجز الأشجار\n• حالات الطلبات\n• رفع إيصال الدفع\n• العقود والشهادات\n• رسوم التشغيل';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversation_id, investor_phone, message }: ChatRequest = await req.json();

    console.log(`[AI Assistant] New message from ${investor_phone}: ${message}`);

    // البحث في قاعدة المعرفة
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('b2f_ai_knowledge_base')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (kbError) throw kbError;

    // إنشاء أو استرجاع المحادثة
    let convId = conversation_id;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('b2f_ai_conversations')
        .insert({
          investor_phone,
          title: message.slice(0, 50) + '...',
        })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
    }

    // حفظ رسالة المستخدم
    const { error: userMsgError } = await supabase
      .from('b2f_ai_messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: message,
      });

    if (userMsgError) throw userMsgError;

    // البحث عن أفضل مطابقة
    const startTime = Date.now();
    const bestMatch = findBestMatch(message, knowledgeBase || []);
    const responseTime = Date.now() - startTime;

    let assistantReply: string;
    let matchedKnowledgeId: string | null = null;
    let confidenceScore = 0;

    if (bestMatch) {
      assistantReply = bestMatch.answer;
      matchedKnowledgeId = bestMatch.id;
      confidenceScore = 0.85; // درجة ثقة عالية للمطابقات

      // زيادة عداد الاستخدام
      await supabase
        .from('b2f_ai_knowledge_base')
        .update({
          usage_count: (bestMatch.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', bestMatch.id);

      console.log(`[AI Assistant] Matched knowledge entry: ${bestMatch.question}`);
    } else {
      assistantReply = generateDefaultResponse(message);
      confidenceScore = 0.3; // درجة ثقة منخفضة للردود الافتراضية

      // تسجيل السؤال بدون إجابة للتعلم المستقبلي
      await supabase
        .from('b2f_ai_learning_log')
        .insert({
          question_pattern: message,
          original_answer: assistantReply,
          confidence_score: confidenceScore,
          improvement_reason: 'No matching knowledge entry found'
        })
        .catch(err => console.warn('[AI Assistant] Failed to log learning:', err));

      console.log(`[AI Assistant] No match found, using default response`);
    }

    // حفظ رسالة المساعد مع معلومات إضافية
    const { error: assistantMsgError } = await supabase
      .from('b2f_ai_messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: assistantReply,
        matched_knowledge_id: matchedKnowledgeId,
        response_time_ms: responseTime,
        confidence_score: confidenceScore,
      });

    if (assistantMsgError) throw assistantMsgError;

    // تحديث وقت آخر رسالة في المحادثة
    await supabase
      .from('b2f_ai_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId);

    // تسجيل السؤال في الأسئلة المتكررة
    try {
      await supabase.rpc('increment_frequent_question', {
        question_text: message
      });
    } catch (err) {
      console.warn('[AI Assistant] Failed to increment frequent question:', err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: convId,
        reply: assistantReply,
        matched: !!bestMatch,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[AI Assistant] Error:', error);
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