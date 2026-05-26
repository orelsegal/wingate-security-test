// Edge function: generate a Blitz game (multiple-choice questions) using Lovable AI.
// Returns JSON shaped like a BlitzGame body (client fills id/createdAt/createdBy).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GeneratedQuestion = {
  type: "multi" | "truefalse";
  text: string;
  options: string[];
  correctIndex: number;
  feedbackRight?: string;
  feedbackWrong?: string;
};

type GeneratedGame = {
  name: string;
  subject: string;
  topic: string;
  grade?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceText?: string;
  questions: GeneratedQuestion[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const subject = String(body?.subject || "").slice(0, 80).trim();
    const topic = String(body?.topic || "").slice(0, 160).trim();
    const grade = String(body?.grade || "").slice(0, 20).trim();
    const difficulty = String(body?.difficulty || "בינוני").slice(0, 20).trim();
    const numQuestions = Math.min(Math.max(Number(body?.numQuestions) || 5, 3), 12);
    const sourceText = String(body?.sourceText || "").slice(0, 4000);
    const instructions = String(body?.instructions || "").slice(0, 600);

    if (!subject || !topic) {
      return new Response(JSON.stringify({ error: "יש למלא מקצוע ונושא" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `אתה יוצר תוכן חינוכי בעברית עבור תלמידי תיכון בישראל.
אתה מייצר משחקי שאלות מרובות-ברירה ("מקצה הבזק") קצרים, מדויקים לימודית, ברורים ומעניינים.

חוקים נוקשים:
- כל הטקסט בעברית תקנית, ללא שגיאות כתיב.
- כל שאלה רלוונטית ישירות לנושא ולמקצוע שצוינו.
- בשאלות multi: בדיוק 4 אפשרויות, אחת בלבד נכונה, ללא כפילויות.
- חשוב מאוד: המסיחים (תשובות שגויות) חייבים להיות באורך דומה לתשובה הנכונה — אל תהפוך את התשובה הנכונה לארוכה או למפורטת יותר מהאחרות.
- מקם את התשובה הנכונה באינדקס שונה בכל שאלה (פזר בין 0,1,2,3) — אל תעדיף עמדה מסוימת.
- correctIndex הוא מספר שלם 0-3 (אינדקס באפשרויות).
- feedbackRight ו-feedbackWrong קצרים (משפט אחד), חינוכיים ומסבירים למה.
- אסור להוסיף טקסט מחוץ ל-JSON המבוקש.
- אסור להשתמש באימוג'ים מוגזמים או בשפה מתחנפת.
- אם סופק טקסט מקור (שיר/קטע) — בנה את השאלות סביבו ישירות.`;

    const userPrompt = `צור משחק "מקצה הבזק" אחד עם הפרטים הבאים:
- מקצוע: ${subject}
- נושא: ${topic}
- כיתה: ${grade || "תיכון"}
- רמת קושי: ${difficulty}
- מספר שאלות: ${numQuestions}
${sourceText ? `\nטקסט מקור להתבסס עליו:\n"""\n${sourceText}\n"""` : ""}
${instructions ? `\nהנחיות נוספות מהמורה: ${instructions}` : ""}

החזר JSON תקין בלבד שמתאים למבנה הסכמה המבוקשת.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_blitz_game",
              description: "החזר את משחק ההבזק שנוצר במבנה הסכמה.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string", description: "שם המשחק (חד וקליט, עד 6 מילים)." },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  grade: { type: "string" },
                  sourceTitle: { type: "string" },
                  sourceAuthor: { type: "string" },
                  sourceText: { type: "string" },
                  questions: {
                    type: "array",
                    minItems: 3,
                    maxItems: 12,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        type: { type: "string", enum: ["multi", "truefalse"] },
                        text: { type: "string" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 2,
                          maxItems: 4,
                        },
                        correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                        feedbackRight: { type: "string" },
                        feedbackWrong: { type: "string" },
                      },
                      required: ["type", "text", "options", "correctIndex"],
                    },
                  },
                },
                required: ["name", "subject", "topic", "questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_blitz_game" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "יותר מדי בקשות. נסה שוב בעוד רגע." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "נגמרו הקרדיטים של Lovable AI. הוסף קרדיטים בהגדרות." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI Gateway error", details: txt.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      return new Response(JSON.stringify({ error: "המודל לא החזיר משחק תקין" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: GeneratedGame;
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return new Response(JSON.stringify({ error: "פלט המודל לא JSON תקין" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanity guard: clamp correctIndex to options length
    parsed.questions = (parsed.questions || []).map((q) => {
      const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
      while (opts.length < (q.type === "truefalse" ? 2 : 4)) opts.push("");
      const idx = Math.min(Math.max(Number(q.correctIndex) || 0, 0), opts.length - 1);
      return { ...q, options: opts, correctIndex: idx };
    });

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
