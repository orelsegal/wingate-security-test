import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `אתה בוחן בגרויות מנוסה במערכת החינוך הישראלית. אתה מעריך עבודות תלמידים ברמת בגרות אמיתית.

כללי הערכה קריטיים:
- תן ציון מספרי 0-100
- עקוב אחרי מחוון מובנה (רובריקה)
- הפחת נקודות רק על שגיאות משמעותיות
- היה הוגן ונדיב במידת הסביר (גישת upper-bound)
- אם השאלה מבקשת סיבה אחת – קבל רק אחת
- אם התלמיד הוסיף מידע לא רלוונטי – התעלם או הפחת מעט
- אם התשובה נכונה אך מנוסחת אחרת – קבל
- אם חסר דרישה מהותית – הפחת בבירור

מבנה המחוון:
1. דיוק תוכני (30%) - האם המידע נכון?
2. מילוי המשימה (25%) - האם ענה על מה שנשאל?
3. מבנה וארגון (20%) - האם התשובה מאורגנת?
4. איכות שפה (15%) - דקדוק, ניסוח, אוצר מילים
5. דיוק (10%) - תשובה ממוקדת לנדרש

למשימות כתיבה באנגלית:
- בדוק ספירת מילים
- בדוק מבנה (פתיחה, גוף, סיום)
- בדוק רלוונטיות למשימה
- תקן דקדוק באופן משמעותי (אל תעניש יתר על מידה)

למשימות הבנת הנקרא:
- ודא שהתשובה תואמת את הטקסט
- ודא שהתלמיד ענה נכון (לא העתיק בעיוורון)
- זהה אי-הבנה

סגנון משוב:
- פנה ישירות לתלמיד (לא בגוף שלישי)
- ציין מה היה טוב
- ציין מה לשפר
- תן גרסה מתוקנת או משופרת
- טון: ברור, מעודד, מקצועי, לא קשוח

אתה חייב להחזיר JSON בפורמט הבא בדיוק (בעברית):
{
  "grade": <מספר 0-100>,
  "rubric": {
    "content_accuracy": { "score": <0-30>, "max": 30, "comment": "..." },
    "task_completion": { "score": <0-25>, "max": 25, "comment": "..." },
    "structure": { "score": <0-20>, "max": 20, "comment": "..." },
    "language": { "score": <0-15>, "max": 15, "comment": "..." },
    "precision": { "score": <0-10>, "max": 10, "comment": "..." }
  },
  "feedback": "משוב כתוב ישיר לתלמיד",
  "improved_answer": "גרסה משופרת של התשובה"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, answer, subject, taskType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `מקצוע: ${subject || "כללי"}
סוג משימה: ${taskType || "כללי"}

שאלה/משימה:
${question}

תשובת התלמיד:
${answer}

הערך את התשובה לפי המחוון. החזר JSON בלבד.`;

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
              name: "submit_grading",
              description: "Submit the grading result for a student submission",
              parameters: {
                type: "object",
                properties: {
                  grade: { type: "number", description: "Final grade 0-100" },
                  rubric: {
                    type: "object",
                    properties: {
                      content_accuracy: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, comment: { type: "string" } }, required: ["score", "max", "comment"] },
                      task_completion: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, comment: { type: "string" } }, required: ["score", "max", "comment"] },
                      structure: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, comment: { type: "string" } }, required: ["score", "max", "comment"] },
                      language: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, comment: { type: "string" } }, required: ["score", "max", "comment"] },
                      precision: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, comment: { type: "string" } }, required: ["score", "max", "comment"] },
                    },
                    required: ["content_accuracy", "task_completion", "structure", "language", "precision"],
                  },
                  feedback: { type: "string", description: "Direct feedback to student in Hebrew" },
                  improved_answer: { type: "string", description: "Improved model answer" },
                },
                required: ["grade", "rubric", "feedback", "improved_answer"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_grading" } },
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
      console.error("AI gateway error:", response.status, t);
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
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { grade: 0, feedback: "שגיאה בעיבוד", rubric: {}, improved_answer: "" };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("grading error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
