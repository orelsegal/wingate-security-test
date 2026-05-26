// Edge function: generate a Blitz game (multiple-choice questions) using Lovable AI.
// Returns a JSON object shaped like BlitzGame (without id/createdAt — client fills those).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const subject: string = (body?.subject || "").toString().slice(0, 80);
    const topic: string = (body?.topic || "").toString().slice(0, 120);
    const grade: string = (body?.grade || "").toString().slice(0, 20);
    const difficulty: string = (body?.difficulty || "בינוני").toString().slice(0, 20);
    const numQuestions: number = Math.min(Math.max(Number(body?.numQuestions) || 5, 3), 12);
    const sourceText: string = (body?.sourceText || "").toString().slice(0, 4000);
    const instructions: string = (body?.instructions || "").toString().slice(0, 600);

    if (!subject || !topic) {
      return new Response(JSON.stringify({ error: "subject ו-topic נדרשים" }), {
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
אתה מייצר משחקי שאלות מרובות-ברירה ("מקצה הבזק") קצרים, מדויקים מבחינה לימודית, ברורים ומעניינים.
חוקים נוקשים:
- כל הטקסט בעברית תקנית, ללא שגיאות.
- כל שאלה תהיה רלוונטית ישירות לנושא ולמקצוע שצוינו.
- בשאלות multi: בדיוק 4 אפשרויות, אחת נכונה בלבד, ללא כפילויות.
- correctIndex הוא מספר 0-3 שמצביע על התשובה הנכונה.
- feedbackRight ו-feedbackWrong קצרים, חינוכיים, מסבירים למה.
- ללא אימוג'ים מוגזמים, ללא משפטים מתחנ