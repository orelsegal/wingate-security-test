import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `אתה עוזר AI למורים במערכת חינוך ישראלית. אתה מייצר תוכן אקדמי ברמת בגרות.

אתה יכול:
1. ליצור בחנים ומבדקים
2. ליצור מטלות ועבודות
3. ליצור מחוונים (רובריקות) לבדיקה
4. ליצור דפי עבודה
5. ליצור שאלות חזרה
6. להתאים חומר לרמות שונות
7. ליצור מפתחות תשובות

כללים:
- תוכן ברמת בגרות ישראלית
- עברית תקנית
- מבנה ברור ומסודר
- התאמה למקצוע ולרמה שנבחרו
- שאלות מגוונות (פתוחות, סגורות, ניתוח, HOTS)
- כלול הנחיות למורה כשרלוונטי

החזר תמיד JSON בפורמט:
{
  "title": "כותרת",
  "content": "התוכן המלא (markdown)",
  "type": "quiz/assignment/rubric/worksheet/review",
  "metadata": { "subject": "", "level": "", "estimated_time": "" }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, subject, contentType, level } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `מקצוע: ${subject || "כללי"}
סוג תוכן: ${contentType || "כללי"}
רמה: ${level || "כללי"}

בקשת המורה:
${prompt}

צור את התוכן המבוקש. החזר JSON בלבד.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_content",
              description: "Submit the generated educational content",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string", description: "Full content in Hebrew markdown" },
                  type: { type: "string", enum: ["quiz", "assignment", "rubric", "worksheet", "review", "answer_key"] },
                  metadata: {
                    type: "object",
                    properties: {
                      subject: { type: "string" },
                      level: { type: "string" },
                      estimated_time: { type: "string" },
                    },
                  },
                },
                required: ["title", "content", "type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "המערכת עמוסה, נסה שוב בעוד רגע" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש חידוש מנוי" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: "תוכן", content: content, type: "worksheet" };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("teacher-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
