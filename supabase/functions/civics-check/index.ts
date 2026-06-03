import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `אתה מורה מנוסה לאזרחות בישראל. תלמיד/ה כותב/ת תשובה במסגרת מטלת ביצוע באזרחות (עבודת חקר 30%).
המשימה שלך: לבדוק האם התשובה מתאימה לדרישה — לא ציון מספרי, אלא משוב חם וקצר.

עקרונות:
- פנייה ישירה לתלמיד, בעברית, בגוף שני.
- אם התשובה ריקה או חסרה — בקש בעדינות להרחיב, הצע נקודות פתיחה.
- אם התשובה כללית מדי — תן דוגמה ספציפית מתחום אזרחי קונקרטי.
- אם התשובה לא קשורה לאזרחות — הסבר מה חסר (זכות/עיקרון דמוקרטי/קבוצה שנפגעת).
- אם התשובה טובה — חזק אותה והצע חידוד אחד בלבד.

סטטוסים:
- "great" — מצוין, אפשר להמשיך
- "good" — סביר, יש חידוד אחד
- "needs_work" — צריך לעבוד שוב, חסרים מרכיבים מהותיים

החזר אך ורק JSON תקין במבנה:
{ "status": "great" | "good" | "needs_work", "headline": "שורה אחת קצרה", "feedback": "1-3 משפטים", "suggestions": ["טיפ קצר 1","טיפ קצר 2"] }`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { question, expectation, answer } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `שלב במטלת ביצוע באזרחות:
${question}

מה מצופה בתשובה טובה:
${expectation || "תשובה ממוקדת, מבוססת על מושגי אזרחות, קשורה לבעיה ולקבוצה שנפגעת"}

תשובת התלמיד:
${answer || "(ריק)"}

החזר JSON בלבד.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_check",
            description: "החזר משוב למילוי השלב",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["great", "good", "needs_work"] },
                headline: { type: "string" },
                feedback: { type: "string" },
                suggestions: { type: "array", items: { type: "string" } },
              },
              required: ["status", "headline", "feedback", "suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_check" } },
      }),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "המערכת עמוסה, נסה שוב בעוד רגע" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "חסרים קרדיטים — פנה למנהל" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }
    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = tc?.function?.arguments
      ? JSON.parse(tc.function.arguments)
      : { status: "good", headline: "תודה", feedback: "עיבדנו את התשובה", suggestions: [] };
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("civics-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
