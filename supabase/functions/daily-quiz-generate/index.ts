// Daily Quiz Generator — creates 10 quiz questions per day per subject,
// caches them in daily_quiz_cache. Sources topics from subject_roadmaps when possible.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

const WEEKDAY_PLAN: Record<number, { subject: string; topic: string }> = {
  0: { subject: "מתמטיקה",     topic: "פונקציות ליניאריות" },
  1: { subject: "ספרות",       topic: "שירה — דובר ודימוי" },
  2: { subject: "לשון",        topic: "שם המספר וצורות יחיד/רבים" },
  3: { subject: "היסטוריה",    topic: "המהפכה הצרפתית" },
  4: { subject: "תנ״ך",        topic: "סיפור יוסף ואחיו" },
  5: { subject: "אנגלית",      topic: "Present Perfect" },
  6: { subject: "אזרחות",      topic: "רשויות השלטון" },
};

function fallbackQuestions(subject: string, topic: string): Question[] {
  // Minimal safe fallback — 10 generic placeholders if AI fails entirely
  return Array.from({ length: 10 }).map((_, i) => ({
    id: `fb-${i}`,
    prompt: `שאלה ${i + 1} — ${subject} (${topic})`,
    options: ["תשובה א'", "תשובה ב'", "תשובה ג'", "תשובה ד'"],
    correctIndex: i % 4,
    explanation: "השאלון לא נטען מ-AI כרגע. נסה שוב מאוחר יותר.",
  }));
}

async function generateWithAI(subject: string, topic: string, topicsFromRoadmap: string[]): Promise<Question[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

  const roadmapText = topicsFromRoadmap.length
    ? `נושאי לימוד ממפת הדרכים: ${topicsFromRoadmap.slice(0, 12).join(", ")}.`
    : "";

  const system = `אתה מורה ישראלי שיוצר שאלוני בגרות מקצועיים בעברית.
החזר JSON תקין בלבד, ללא טקסט נוסף.`;

  const user = `צור 10 שאלות אמריקאיות (4 תשובות לכל שאלה, אחת נכונה) למקצוע: ${subject}.
נושא ההיום: ${topic}.
${roadmapText}
דרישות:
- שאלות במגוון רמות (קל / בינוני / קשה).
- ניסוח עברי תקני, ללא ניקוד.
- כל שאלה עומדת בפני עצמה.
- TR פסיכומטרי: רק תשובה אחת נכונה לחלוטין.
- explanation קצר (משפט) למה התשובה נכונה.

החזר JSON במבנה:
{
  "questions": [
    { "prompt": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." }
  ]
}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const rawQs = Array.isArray(parsed?.questions) ? parsed.questions : [];

  const cleaned: Question[] = rawQs.slice(0, 10).map((q: any, i: number) => ({
    id: `q-${i}`,
    prompt: String(q?.prompt ?? "").trim(),
    options: Array.isArray(q?.options) ? q.options.slice(0, 4).map((x: any) => String(x)) : [],
    correctIndex: Math.max(0, Math.min(3, Number(q?.correctIndex ?? 0))),
    explanation: q?.explanation ? String(q.explanation) : undefined,
  })).filter((q: Question) => q.prompt && q.options.length === 4);

  if (cleaned.length < 5) throw new Error("AI returned too few valid questions");
  // pad up to 10 if needed
  while (cleaned.length < 10) {
    const fb = fallbackQuestions(subject, topic)[cleaned.length];
    cleaned.push({ ...fb, id: `q-${cleaned.length}` });
  }
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const today = new Date();
    const dateStr =
      url.searchParams.get("date") || today.toISOString().slice(0, 10);
    const dow = new Date(dateStr + "T00:00:00").getDay();
    const plan = WEEKDAY_PLAN[dow] ?? WEEKDAY_PLAN[0];
    const subject = url.searchParams.get("subject") || plan.subject;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. cache hit?
    const { data: cached } = await supabase
      .from("daily_quiz_cache")
      .select("*")
      .eq("quiz_date", dateStr)
      .eq("subject", subject)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({
        date: dateStr, subject, topic: cached.topic,
        questions: cached.questions, cached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. pull roadmap topics for this subject
    const { data: subjectRow } = await supabase
      .from("subjects").select("id").eq("subject_name", subject).maybeSingle();

    let topics: string[] = [];
    if (subjectRow?.id) {
      const { data: rm } = await supabase
        .from("subject_roadmaps")
        .select("topic_name")
        .eq("subject_id", subjectRow.id)
        .order("order_index");
      topics = (rm ?? []).map((r: any) => r.topic_name).filter(Boolean);
    }
    const topic = topics[0] || plan.topic;

    // 3. generate via AI
    let questions: Question[];
    try {
      questions = await generateWithAI(subject, topic, topics);
    } catch (err) {
      console.error("AI generation failed", err);
      questions = fallbackQuestions(subject, topic);
    }

    // 4. cache
    await supabase.from("daily_quiz_cache").insert({
      quiz_date: dateStr, subject, topic, questions,
    });

    return new Response(JSON.stringify({
      date: dateStr, subject, topic, questions, cached: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
