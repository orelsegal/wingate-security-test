/* ═══ Centralized Bagrut Course Content ═══
   Real curriculum-aligned content for Israeli Bagrut subjects.
   Each subject has configurable internal/external splits. */

export interface LearningItem {
  id: string;
  title: string;
  explanation: string;
  example?: string;
  practice?: string;
  quiz?: { question: string; options: string[]; correct: number }[];
  tip?: string;
}

export interface UnitDef {
  id: string;
  title: string;
  items: LearningItem[];
}

export interface SubjectPartDef {
  id: string;
  title: string;
  weight: string;
  description: string;
  units: UnitDef[];
  materials: { id: string; title: string; type: "file" | "link" | "video"; url?: string }[];
  assignments: { id: string; title: string; grade?: number; dueDate?: string; submitted?: boolean }[];
}

export interface SubjectDef {
  name: string;
  subtitle: string;
  icon: string;
  parts: SubjectPartDef[];
}

export const courseContent: Record<string, SubjectDef> = {
  "אנגלית": {
    name: "אנגלית",
    subtitle: "5 יח״ל · Module E · F · G",
    icon: "Globe",
    parts: [
      {
        id: "eng-e", title: "Module E — Literature & Reading", weight: "Literature",
        description: "Reading comprehension, unseen texts, and literature analysis",
        units: [
          {
            id: "eng-e-1", title: "Reading Comprehension — Main Idea",
            items: [
              {
                id: "eng-e-1-1", title: "Finding the Main Idea",
                explanation: "The main idea is the central message of a text. It answers: What is the text mainly about?\n\nTo find it:\n1. Read the title and first paragraph carefully\n2. Look for repeated words or themes\n3. Ask: What point is the author trying to make?",
                example: "Text: 'Many schools now use tablets instead of textbooks. Students find digital learning more engaging, and teachers can update materials easily.'\n\nMain idea: Schools are shifting to digital learning tools.",
                practice: "Read the following text and identify the main idea:\n'Plastic pollution in the ocean has reached alarming levels. Marine animals mistake plastic for food, and microplastics enter the human food chain through fish consumption.'",
                quiz: [
                  { question: "What is the main idea?", options: ["Fish eat plastic", "Ocean plastic pollution is a serious problem", "Humans eat fish", "Microplastics are small"], correct: 1 },
                ],
                tip: "המילה החוזרת ביותר בטקסט מעידה לרוב על הרעיון המרכזי"
              },
              {
                id: "eng-e-1-2", title: "Supporting Details",
                explanation: "Supporting details are facts, examples, or reasons that back up the main idea.\n\nTypes of supporting details:\n• Facts and statistics\n• Examples\n• Reasons\n• Descriptions\n• Expert opinions",
                example: "Main idea: Exercise is good for mental health.\nSupporting details:\n- Studies show 30 minutes of daily exercise reduces anxiety by 40%\n- People who exercise regularly report better sleep quality\n- Physical activity releases endorphins",
                practice: "List three supporting details from the ocean pollution text above.",
                quiz: [
                  { question: "Which is a supporting detail, not a main idea?", options: ["Pollution is dangerous", "40% of sea turtles have eaten plastic", "The environment needs protection", "We should recycle"], correct: 1 },
                ],
              },
              {
                id: "eng-e-1-3", title: "Text Types & Structures",
                explanation: "Different text types have different purposes:\n\n• Argumentative — presents and defends a position\n• Informative — provides facts and information\n• Narrative — tells a story\n• Descriptive — paints a picture with words\n• Comparative — examines similarities and differences",
                practice: "Identify the text type: 'While both dogs and cats make great pets, dogs require more outdoor time, whereas cats are more independent.'",
                quiz: [
                  { question: "What type of text is this?", options: ["Narrative", "Argumentative", "Comparative", "Descriptive"], correct: 2 },
                ],
              },
            ],
          },
          {
            id: "eng-e-2", title: "Literature — Poetry & Drama",
            items: [
              {
                id: "eng-e-2-1", title: "Analyzing Poetry",
                explanation: "When analyzing a poem, consider:\n\n1. Theme — the main message or lesson\n2. Tone — the mood or attitude (happy, sad, ironic)\n3. Literary devices — metaphor, simile, imagery, alliteration\n4. Structure — stanzas, rhyme scheme, rhythm\n5. Speaker — who is speaking and to whom",
                example: "'The road not taken' by Robert Frost uses a fork in the road as a metaphor for life choices. The tone is reflective, and the theme is about the impact of our decisions.",
                practice: "Read a short poem provided by your teacher and identify: theme, tone, and one literary device.",
              },
              {
                id: "eng-e-2-2", title: "Drama Analysis",
                explanation: "When studying a play:\n\n• Character development — how characters change\n• Conflict — internal vs. external\n• Setting — time and place\n• Stage directions — what they reveal\n• Dialogue — what characters say vs. what they mean (subtext)",
                practice: "Choose a scene from the play you're studying. Identify the main conflict and how the characters respond to it.",
              },
            ],
          },
        ],
        materials: [
          { id: "em1", title: "Reading Comprehension Strategies Guide", type: "file" },
          { id: "em2", title: "Google Classroom — English", type: "link", url: "#" },
        ],
        assignments: [
          { id: "ea1", title: "Unseen Text — Main Idea Practice", submitted: false },
          { id: "ea2", title: "Poem Analysis Essay", submitted: false },
        ],
      },
      {
        id: "eng-f", title: "Module F — Writing", weight: "Writing",
        description: "Essay writing, formal letters, and structured responses",
        units: [
          {
            id: "eng-f-1", title: "Essay Writing",
            items: [
              {
                id: "eng-f-1-1", title: "Essay Structure",
                explanation: "A Bagrut essay (70-90 words for 3 units, 120-140 for 5 units) must have:\n\n1. Introduction — state your position clearly\n2. Body — 2-3 supporting points with examples\n3. Conclusion — restate your position\n\nKey rules:\n• Stay on topic\n• Use linking words (However, Furthermore, In addition)\n• Don't copy from the prompt",
                example: "Topic: Should schools ban phones?\n\nIntro: In my opinion, schools should limit phone use during class hours.\nBody: First, phones distract students from learning... Second, social media creates peer pressure...\nConclusion: To sum up, limiting phones helps create a better learning environment.",
                practice: "Write a 70-90 word essay on: 'Should students wear school uniforms?'",
                quiz: [
                  { question: "What should an essay introduction include?", options: ["A story", "Your clear position", "Statistics", "A question"], correct: 1 },
                ],
              },
              {
                id: "eng-f-1-2", title: "Formal Letters & Reports",
                explanation: "Formal writing requires:\n• Appropriate greeting (Dear Sir/Madam)\n• Clear purpose in the opening\n• Formal language (no slang)\n• Polite closing (Yours sincerely/faithfully)\n\nReport structure:\n• Title\n• Introduction (purpose)\n• Findings\n• Recommendations",
                practice: "Write a formal letter to your school principal suggesting a new after-school activity.",
              },
            ],
          },
        ],
        materials: [],
        assignments: [{ id: "ef1", title: "Essay — Technology in Education", submitted: false }],
      },
      {
        id: "eng-g", title: "Module G — Speaking & Listening", weight: "Oral",
        description: "Oral presentation and listening comprehension skills",
        units: [
          {
            id: "eng-g-1", title: "Oral Presentation Skills",
            items: [
              {
                id: "eng-g-1-1", title: "Planning Your Presentation",
                explanation: "A good oral presentation:\n\n1. Has a clear structure (intro, body, conclusion)\n2. Uses visual aids appropriately\n3. Maintains eye contact\n4. Speaks clearly and at a good pace\n5. Engages the audience\n\nPreparation tips:\n• Practice out loud\n• Time yourself\n• Prepare for questions",
                practice: "Prepare a 3-minute presentation about a topic you care about. Record yourself and listen back.",
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
    ],
  },
  "מתמטיקה": {
    name: "מתמטיקה",
    subtitle: "4/5 יח״ל · לפי רמה",
    icon: "Calculator",
    parts: [
      {
        id: "math-1", title: "אלגברה ופונקציות", weight: "~35%",
        description: "משוואות, פונקציות ליניאריות וריבועיות",
        units: [
          {
            id: "math-1-1", title: "משוואות ואי-שוויונות",
            items: [
              {
                id: "math-1-1-1", title: "משוואות ממעלה ראשונה",
                explanation: "משוואה ממעלה ראשונה היא משוואה מהצורה ax + b = 0\n\nשלבי פתרון:\n1. העבר את כל האיברים עם x לצד אחד\n2. העבר את המספרים לצד השני\n3. חלק ב-a\n\nזכור: מה שעושים לצד אחד — עושים גם לצד השני!",
                example: "3x + 5 = 20\n3x = 20 - 5\n3x = 15\nx = 5\n\nבדיקה: 3(5) + 5 = 15 + 5 = 20 ✓",
                practice: "פתור: 4x - 8 = 12",
                quiz: [
                  { question: "מהו הפתרון של 2x + 6 = 14?", options: ["x = 3", "x = 4", "x = 10", "x = 8"], correct: 1 },
                ],
                tip: "תמיד בדוק את התשובה על ידי הצבה חזרה במשוואה המקורית"
              },
              {
                id: "math-1-1-2", title: "פונקציה ליניארית",
                explanation: "פונקציה ליניארית: y = mx + b\n\n• m = שיפוע (עלייה/ריצה)\n• b = חיתוך עם ציר y\n• הגרף הוא קו ישר\n\nשיפוע חיובי → הקו עולה\nשיפוע שלילי → הקו יורד\nשיפוע = 0 → קו אופקי",
                example: "y = 2x + 3\n• שיפוע: 2 (עולה)\n• חיתוך y: 3\n• נקודת חיתוך: (0, 3)\n• חיתוך x: x = -1.5",
                practice: "שרטט את הגרף של y = -x + 4. מצא את נקודות החיתוך עם הצירים.",
                quiz: [
                  { question: "מהו השיפוע של y = 3x - 7?", options: ["3", "-7", "7", "-3"], correct: 0 },
                ],
              },
              {
                id: "math-1-1-3", title: "פונקציה ריבועית",
                explanation: "פונקציה ריבועית: y = ax² + bx + c\n\n• a > 0 → פרבולה פתוחה למעלה (חיוך)\n• a < 0 → פרבולה פתוחה למטה (עצב)\n\nקודקוד: x = -b/(2a)\nדיסקרימיננטה: Δ = b² - 4ac\n\nΔ > 0 → שני פתרונות\nΔ = 0 → פתרון יחיד\nΔ < 0 → אין פתרונות ממשיים",
                example: "y = x² - 4x + 3\nקודקוד: x = 4/2 = 2, y = 4-8+3 = -1 → (2,-1)\nΔ = 16-12 = 4 → שורשים: x=1, x=3",
                practice: "מצא את הקודקוד ונקודות החיתוך של y = x² - 6x + 5",
                quiz: [
                  { question: "כמה פתרונות יש כאשר Δ = 0?", options: ["0", "1", "2", "אינסוף"], correct: 1 },
                ],
              },
            ],
          },
        ],
        materials: [{ id: "mm1", title: "סרטון — פונקציה ריבועית", type: "video", url: "#" }],
        assignments: [],
      },
      {
        id: "math-2", title: "גיאומטריה וטריגונומטריה", weight: "~35%",
        description: "משולשים, מעגל וטריגונומטריה",
        units: [
          {
            id: "math-2-1", title: "גיאומטריה במישור",
            items: [
              {
                id: "math-2-1-1", title: "משולשים — תכונות ומשפטים",
                explanation: "סוגי משולשים:\n• שווה צלעות — כל הצלעות וזוויות שוות (60°)\n• שווה שוקיים — שתי צלעות שוות, זוויות בסיס שוות\n• ישר זווית — זווית אחת 90°\n\nמשפטים חשובים:\n• סכום זוויות = 180°\n• משפט פיתגורס: a² + b² = c²\n• חפיפות: צ.ז.צ, ז.צ.ז, צ.צ.צ",
                example: "במשולש ישר זווית עם ניצבים 3 ו-4:\nיתר = √(9+16) = √25 = 5",
                practice: "חשב את היתר במשולש ישר זווית עם ניצבים 5 ו-12.",
                quiz: [
                  { question: "מה סכום הזוויות במשולש?", options: ["90°", "180°", "270°", "360°"], correct: 1 },
                ],
              },
              {
                id: "math-2-1-2", title: "מעגל — תכונות",
                explanation: "מושגי יסוד:\n• רדיוס (r) — מהמרכז להיקף\n• קוטר (d) = 2r\n• היקף = 2πr\n• שטח = πr²\n\nמשיק למעגל מאונך לרדיוס בנקודת ההשקה.",
                example: "מעגל עם רדיוס 5:\nהיקף = 2π(5) = 10π ≈ 31.4\nשטח = π(25) = 25π ≈ 78.5",
                practice: "חשב את ההיקף והשטח של מעגל עם קוטר 14.",
              },
            ],
          },
          {
            id: "math-2-2", title: "טריגונומטריה",
            items: [
              {
                id: "math-2-2-1", title: "יחסים טריגונומטריים",
                explanation: "במשולש ישר זווית:\n\nsin α = ניצב נגדי / יתר\ncos α = ניצב סמוך / יתר\ntan α = ניצב נגדי / ניצב סמוך\n\nזכור: SOH-CAH-TOA\nSin = Opposite/Hypotenuse\nCos = Adjacent/Hypotenuse\nTan = Opposite/Adjacent",
                example: "במשולש ישר זווית עם ניצבים 3 ו-4 ויתר 5:\nsin α = 3/5 = 0.6\ncos α = 4/5 = 0.8\ntan α = 3/4 = 0.75",
                practice: "במשולש ישר זווית: יתר = 13, ניצב = 5. מצא את הניצב השני ואת ערכי sin, cos, tan.",
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
      {
        id: "math-3", title: "הסתברות וסטטיסטיקה", weight: "~30%",
        description: "הסתברות, התפלגויות וסטטיסטיקה תיאורית",
        units: [
          {
            id: "math-3-1", title: "הסתברות",
            items: [
              {
                id: "math-3-1-1", title: "עקרונות בסיסיים",
                explanation: "הסתברות של מאורע A:\nP(A) = מספר התוצאות הרצויות / מספר כל התוצאות\n\n0 ≤ P(A) ≤ 1\nP(A) + P(לא A) = 1\n\nמאורעות בלתי תלויים:\nP(A ∩ B) = P(A) × P(B)",
                example: "הטלת קוביה: P(מספר זוגי) = 3/6 = 1/2\nשתי קוביות: P(שתיהן 6) = 1/6 × 1/6 = 1/36",
                practice: "בשקית 3 כדורים אדומים ו-5 כחולים. מה ההסתברות לשלוף כדור אדום?",
                quiz: [
                  { question: "מה ההסתברות לקבל 'עץ' בהטלת מטבע?", options: ["0", "1/4", "1/2", "1"], correct: 2 },
                ],
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
    ],
  },
  "היסטוריה": {
    name: "היסטוריה",
    subtitle: "30% פנימי + 70% חיצוני",
    icon: "Scroll",
    parts: [
      {
        id: "hist-30", title: "30% פנימי", weight: "30%",
        description: "הערכה בית-ספרית — לאומיות, מלחמת העולם הראשונה, התקופה הבין-מלחמתית",
        units: [
          {
            id: "hist-30-1", title: "לאומיות באירופה",
            items: [
              {
                id: "hist-30-1-1", title: "עקרונות הלאומיות",
                explanation: "הלאומיות היא תנועה רעיונית ופוליטית שצמחה באירופה במאה ה-18 ו-19.\n\nעקרונות מרכזיים:\n• זכות ההגדרה העצמית — לכל עם הזכות לשלוט בגורלו\n• ריבונות — השלטון שייך לעם ולא למלך\n• זהות משותפת — שפה, תרבות, היסטוריה משותפת\n\nגורמים להתפתחות הלאומיות:\n1. המהפכה הצרפתית (1789)\n2. מלחמות נפוליאון\n3. המהפכה התעשייתית\n4. התפשטות הדפוס והחינוך",
                example: "דוגמה: איחוד איטליה (1861) — גריבלדי, מאציני וקאבור פעלו לאיחוד חצי האי האיטלקי לממלכה אחת מתוך תחושה לאומית משותפת.",
                practice: "השווה בין שני סוגי לאומיות: לאומיות אזרחית (צרפת) ולאומיות אתנית (גרמניה). מה ההבדלים העיקריים?",
                quiz: [
                  { question: "מהו עקרון ההגדרה העצמית?", options: ["זכות המלך לשלוט", "זכות העם להחליט על גורלו", "חופש הדת", "שוויון כלכלי"], correct: 1 },
                ],
              },
              {
                id: "hist-30-1-2", title: "מלחמת העולם הראשונה — סיבות",
                explanation: "הסיבות למלחמת העולם הראשונה (MAIN):\n\nM — מיליטריזם (תחרות חימוש)\nA — אימפריאליזם (תחרות על מושבות)\nI — אידאולוגיה לאומנית\nN — ברית נאט\"ו (מערכת הבריתות)\n\nהגורם המיידי: רצח הארכידוכס פרנץ פרדיננד בסרייבו (28.6.1914)\n\nשני הגושים:\n• מדינות ההסכמה: בריטניה, צרפת, רוסיה\n• מדינות הברית: גרמניה, אוסטריה-הונגריה, האימפריה העות'מנית",
                practice: "הסבר כיצד מערכת הבריתות הפכה סכסוך מקומי למלחמה עולמית.",
              },
            ],
          },
        ],
        materials: [{ id: "hm1", title: "מצגת — הלאומיות באירופה", type: "file" }],
        assignments: [],
      },
      {
        id: "hist-70", title: "70% חיצוני", weight: "70%",
        description: "מלחה\"ע השנייה, השואה, הקמת המדינה, הסכסוך",
        units: [
          {
            id: "hist-70-1", title: "מלחמת העולם השנייה והשואה",
            items: [
              {
                id: "hist-70-1-1", title: "עליית הנאציזם",
                explanation: "גורמים לעליית הנאציזם בגרמניה:\n\n1. משבר כלכלי — אינפלציה, אבטלה המונית\n2. חוזה ורסאי — תנאים משפילים לגרמניה\n3. חולשת הרפובליקה — אי-יציבות פוליטית\n4. תעמולה — שימוש במדיה ובנאומים\n5. אנטישמיות — הפיכת היהודים לשעיר לעזאזל\n\nשלבי הרדיפה:\nחרם → חוקי נירנברג → ליל הבדולח → ריכוז → השמדה",
                example: "חוקי נירנברג (1935) — שללו את אזרחותם של יהודי גרמניה ואסרו נישואים מעורבים. חוקים אלו הפכו את האפליה לרשמית ומוסדית.",
                practice: "הסבר כיצד התעמולה הנאצית תרמה לעליית הנאציזם. התייחס לשני אמצעי תעמולה לפחות.",
                quiz: [
                  { question: "מתי נחקקו חוקי נירנברג?", options: ["1933", "1935", "1938", "1941"], correct: 1 },
                ],
              },
              {
                id: "hist-70-1-2", title: "הקמת מדינת ישראל",
                explanation: "תהליך הקמת המדינה:\n\n• הצהרת בלפור (1917) — הבטחה לבית לאומי\n• המנדט הבריטי (1920-1948)\n• הספר הלבן (1939) — הגבלת עלייה\n• החלטת החלוקה (29.11.1947 — החלטה 181)\n• הכרזת העצמאות (14.5.1948)\n• מלחמת העצמאות (1948-1949)\n\nמגילת העצמאות מדגישה:\n• זכות היהודים למדינה\n• שוויון לכל אזרח\n• חופש דת ומצפון",
                practice: "נתח את החלטת החלוקה: מה הציעה? מדוע הערבים דחו אותה?",
              },
            ],
          },
        ],
        materials: [
          { id: "m1", title: "מצגת — מלחמת העולם השנייה", type: "file" },
          { id: "m2", title: "סרטון — השואה", type: "video", url: "#" },
        ],
        assignments: [
          { id: "a1", title: "עבודה — מלחמת העולם השנייה", grade: 82, submitted: true },
          { id: "a2", title: "בוחן — השואה", grade: 75, submitted: true },
        ],
      },
    ],
  },
  "אזרחות": {
    name: "אזרחות",
    subtitle: "30% פנימי + 70% חיצוני",
    icon: "Scale",
    parts: [
      {
        id: "civ-30", title: "30% פנימי", weight: "30%",
        description: "עקרונות הדמוקרטיה, זכויות האדם, מגילת העצמאות",
        units: [
          {
            id: "civ-30-1", title: "עקרונות הדמוקרטיה",
            items: [
              {
                id: "civ-30-1-1", title: "מהי דמוקרטיה?",
                explanation: "דמוקרטיה = שלטון העם\n\nעקרונות יסוד:\n1. ריבונות העם — העם הוא מקור הסמכות\n2. שלטון החוק — כולם כפופים לחוק\n3. זכויות אדם ואזרח — חירויות בסיסיות מוגנות\n4. הפרדת רשויות — מחוקקת, מבצעת, שופטת\n5. בחירות חופשיות — כלליות, ישירות, שוות, חשאיות\n6. שוויון — כל אזרח שווה בפני החוק\n7. פלורליזם — לגיטימציה לדעות שונות",
                example: "חוק יסוד: כבוד האדם וחירותו (1992) — מגן על הזכות לחיים, לכבוד, לחירות, לפרטיות ולקניין.",
                practice: "הסבר מדוע הפרדת רשויות חשובה לדמוקרטיה. תן דוגמה מהמציאות הישראלית.",
                quiz: [
                  { question: "מהו עקרון שלטון החוק?", options: ["השלטון קובע את החוק", "כולם כפופים לחוק", "המלך מעל החוק", "אין צורך בחוקים"], correct: 1 },
                ],
              },
              {
                id: "civ-30-1-2", title: "זכויות האדם",
                explanation: "סוגי זכויות:\n\n1. זכויות טבעיות — חיים, חירות, כבוד\n2. זכויות חברתיות — חינוך, בריאות, רווחה\n3. זכויות פוליטיות — הצבעה, ביטוי, הפגנה\n\nמאפיינים:\n• אוניברסליות — שייכות לכל אדם\n• אינן ניתנות להעברה\n• מוגנות בחוק\n\nמגבלות: זכויות אינן מוחלטות — ניתן להגבילן לצורך הגנה על זכויות אחרים או על הציבור.",
                practice: "הסבר מתי מותר להגביל את חופש הביטוי. תן שתי דוגמאות.",
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
      {
        id: "civ-70", title: "70% חיצוני", weight: "70%",
        description: "מוסדות השלטון, חוקה, אזרחות פעילה, מיעוטים",
        units: [
          {
            id: "civ-70-1", title: "מוסדות השלטון בישראל",
            items: [
              {
                id: "civ-70-1-1", title: "שלוש הרשויות",
                explanation: "הרשות המחוקקת — הכנסת:\n• 120 חברי כנסת\n• מחוקקת חוקים\n• מפקחת על הממשלה\n\nהרשות המבצעת — הממשלה:\n• ראש ממשלה ושרים\n• מבצעת את החוקים\n• קובעת מדיניות\n\nהרשות השופטת — בתי המשפט:\n• שופטת לפי החוק\n• מגינה על זכויות\n• ביקורת שיפוטית (בג\"ץ)",
                example: "בג\"ץ יכול לבטל חוק שפוגע בזכויות יסוד. לדוגמה: פסיקת בג\"ץ על חוק הגיוס.",
                practice: "הסבר את מנגנון הביקורת ההדדית בין שלוש הרשויות.",
                quiz: [
                  { question: "כמה חברי כנסת יש?", options: ["80", "100", "120", "150"], correct: 2 },
                ],
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
    ],
  },
  "ספרות": {
    name: "ספרות",
    subtitle: "30% פנימי + 70% חיצוני",
    icon: "BookOpen",
    parts: [
      {
        id: "lit-30", title: "30% פנימי", weight: "30%",
        description: "שירה מודרנית, סיפור קצר, ניתוח טקסט",
        units: [
          {
            id: "lit-30-1", title: "ניתוח שירה",
            items: [
              {
                id: "lit-30-1-1", title: "כלים לניתוח שיר",
                explanation: "בניתוח שיר יש להתייחס ל:\n\n1. נושא — על מה השיר?\n2. דובר — מי מדבר? למי?\n3. מבנה — בתים, חרוז, קצב\n4. לשון ודימויים — מטפורה, דימוי, אנלוגיה\n5. טון ואווירה — שמח, עצוב, אירוני\n6. מסר — מה המשורר רוצה להעביר?\n\nאמצעים רטוריים:\n• חזרה — הדגשה\n• ניגוד — חידוד\n• שאלה רטורית — מעורבות הקורא",
                example: "בשיר \"ארץ אהבתי\" של רחל:\nדוברת — המשוררת עצמה\nנושא — כמיהה לארץ ישראל\nדימוי — \'דל לחמה — לחמה דל\' (חזרה)\nמסר — אהבה לארץ למרות הפשטות",
                practice: "קרא את השיר שלמדת ונתח אותו לפי 4 מהקריטריונים למעלה.",
                quiz: [
                  { question: "מהי מטפורה?", options: ["השוואה עם כמו", "השוואה ישירה ללא 'כמו'", "שאלה ללא תשובה", "חזרה על מילה"], correct: 1 },
                ],
              },
            ],
          },
        ],
        materials: [{ id: "lm1", title: "דף עבודה — שירה", type: "file" }],
        assignments: [{ id: "la1", title: "ניתוח שיר", submitted: false }],
      },
      {
        id: "lit-70", title: "70% חיצוני", weight: "70%",
        description: "רומן, דרמה, שירה קלאסית, חיבור השוואתי",
        units: [
          {
            id: "lit-70-1", title: "ניתוח רומן ודרמה",
            items: [
              {
                id: "lit-70-1-1", title: "ניתוח דמות",
                explanation: "בניתוח דמות בספרות:\n\n1. מאפיינים חיצוניים — תיאור, גיל, מקום\n2. מאפיינים פנימיים — אופי, רגשות, מוטיבציה\n3. שינוי — כיצד הדמות משתנה?\n4. יחסים — עם דמויות אחרות\n5. אמצעי אפיון — ישירים (מספר אומר) ועקיפים (מעשים, דיבור)\n\nהתייחס ל:\n• מה הדמות אומרת\n• מה הדמות עושה\n• מה אחרים אומרים עליה\n• מה המספר חושף",
                practice: "בחר דמות מהרומן שלמדת ונתח אותה לפי 4 הקריטריונים.",
              },
              {
                id: "lit-70-1-2", title: "חיבור השוואתי",
                explanation: "מבנה חיבור השוואתי:\n\n1. פתיחה — הצגת שני הטקסטים + הנושא המשותף\n2. גוף — השוואה לפי קריטריונים:\n   • נקודת דמיון\n   • נקודת שוני\n   • ניתוח + ציטוטים\n3. סיכום — מה למדנו מההשוואה?\n\nטיפים:\n• השתמש במילות קישור: לעומת, בניגוד ל, בדומה ל\n• הבא ציטוטים מהטקסטים\n• אל תספר את העלילה — נתח!",
                practice: "כתוב חיבור השוואתי קצר (15-20 שורות) על נושא שבחרת מתוך שני יצירות שלמדת.",
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
    ],
  },
  "לשון": {
    name: "לשון",
    subtitle: "20% פנימי + 80% חיצוני",
    icon: "Languages",
    parts: [
      {
        id: "heb-20", title: "20% פנימי", weight: "20%",
        description: "תחביר בסיסי, חלקי דיבר, פיסוק",
        units: [
          {
            id: "heb-20-1", title: "תחביר ודקדוק",
            items: [
              {
                id: "heb-20-1-1", title: "חלקי הדיבר",
                explanation: "חלקי דיבר עיקריים:\n\n1. שם עצם — מציין דבר/אדם/מקום (ספר, ילד, ירושלים)\n2. פועל — מציין פעולה (כתב, רץ, חשב)\n3. שם תואר — מתאר שם עצם (יפה, גדול, חכם)\n4. תואר הפועל — מתאר את הפועל (מהר, בזהירות)\n5. מילת יחס — מחברת (ב-, ל-, על, מ-)\n6. מילת חיבור — מקשרת משפטים (ו-, כי, אבל, אם)\n\nזיהוי:\n• שם עצם — שאלת מי/מה\n• פועל — שאלת מה עושה\n• תואר — שאלת איזה/איזו",
                example: "\"הילד הגבוה רץ מהר בפארק\"\nשם עצם: ילד, פארק\nפועל: רץ\nתואר: גבוה\nתואר הפועל: מהר\nמילת יחס: ב-",
                practice: "סמן את חלקי הדיבר במשפט: \'המורה הנמרצת לימדה את התלמידים בכיתה המרווחת.\'",
                quiz: [
                  { question: "מהו חלק הדיבר של המילה 'יפה'?", options: ["שם עצם", "פועל", "שם תואר", "תואר הפועל"], correct: 2 },
                ],
              },
              {
                id: "heb-20-1-2", title: "פיסוק",
                explanation: "כללי פיסוק עיקריים:\n\n• נקודה (.) — סוף משפט\n• פסיק (,) — הפרדה בין פסוקיות, פנייה, רשימה\n• נקודתיים (:) — לפני ציטוט, רשימה, הסבר\n• סימן שאלה (?) — משפט שאלה\n• סימן קריאה (!) — משפט קריאה/רגש\n• מכפלה (\"...\") — ציטוט ישיר\n• מקף (—) — הפסקה, הוספה",
                practice: "הוסף פיסוק למשפט: \'דני שאל את המורה מתי המבחן המורה ענתה ביום שלישי\'",
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
      {
        id: "heb-80", title: "80% חיצוני", weight: "80%",
        description: "הבנת הנקרא, כתיבה אקדמית, לשון פורמלית, מבנה טקסט",
        units: [
          {
            id: "heb-80-1", title: "הבנת הנקרא",
            items: [
              {
                id: "heb-80-1-1", title: "אסטרטגיות הבנת הנקרא",
                explanation: "שלבים בהבנת הנקרא:\n\n1. קריאה ראשונה — הבנה כללית\n2. קריאה שנייה — מיקוד בשאלות\n3. סימון — מילות מפתח ורעיונות מרכזיים\n\nסוגי שאלות:\n• שאלות הבנה — מידע מפורש בטקסט\n• שאלות הסקה — מסקנות מהטקסט\n• שאלות העמקה — ניתוח, השוואה, הערכה\n\nטיפ: חפש את התשובה בטקסט עצמו לפני שאתה ממציא!",
                practice: "קרא טקסט שקיבלת וענה על 3 שאלות ברמות שונות: הבנה, הסקה, העמקה.",
                quiz: [
                  { question: "מהי שאלת הסקה?", options: ["שאלה שהתשובה מפורשת", "שאלה שצריך להסיק מהטקסט", "שאלה על הכותב", "שאלה על האיורים"], correct: 1 },
                ],
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
    ],
  },
  "מבוא למדעים": {
    name: "מבוא למדעים",
    subtitle: "קורס אינטראקטיבי",
    icon: "Lightbulb",
    parts: [
      {
        id: "sci-1", title: "יסודות המדע", weight: "50%",
        description: "שיטה מדעית, מדידה, כוחות ואנרגיה",
        units: [
          {
            id: "sci-1-1", title: "השיטה המדעית",
            items: [
              {
                id: "sci-1-1-1", title: "מהי שיטה מדעית?",
                explanation: "השיטה המדעית היא תהליך שיטתי לחקירת העולם:\n\n1. תצפית — שם לב לתופעה\n2. שאלת מחקר — מנסח שאלה\n3. השערה — הצעת תשובה אפשרית\n4. ניסוי — בדיקת ההשערה\n5. תוצאות — ניתוח הנתונים\n6. מסקנה — האם ההשערה אוששה?\n\nחשוב: ניסוי טוב בודק משתנה אחד בכל פעם!",
                example: "שאלה: האם צמחים גדלים מהר יותר עם מוזיקה?\nהשערה: צמחים שנחשפים למוזיקה יגדלו 20% יותר.\nניסוי: שתי קבוצות צמחים — עם ובלי מוזיקה. מדידה שבועית.",
                practice: "בחר תופעה מחיי היומיום וכתוב עבורה: שאלת מחקר, השערה, ותכנון ניסוי פשוט.",
                quiz: [
                  { question: "מה השלב הראשון בשיטה המדעית?", options: ["ניסוי", "השערה", "תצפית", "מסקנה"], correct: 2 },
                ],
              },
            ],
          },
          {
            id: "sci-1-2", title: "כוחות ותנועה",
            items: [
              {
                id: "sci-1-2-1", title: "חוקי ניוטון",
                explanation: "שלושת חוקי ניוטון:\n\n1. חוק ראשון (האינרציה):\nגוף נשאר במנוחה או בתנועה קבועה אלא אם כוח פועל עליו.\n\n2. חוק שני: F = m × a\nכוח = מסה × תאוצה\n\n3. חוק שלישי:\nלכל פעולה יש תגובה שווה בגודל והפוכה בכיוון.\n\nדוגמה מהספורט: כשאתה בועט בכדור — הכדור דוחף בחזרה את הרגל שלך (חוק שלישי)!",
                example: "F = m × a\nאם מסה = 5 ק\"ג ותאוצה = 3 מ\"ש²\nאז F = 5 × 3 = 15 ניוטון",
                practice: "חשב: מה הכוח הדרוש להאיץ כדור במסה 0.5 ק\"ג בתאוצה של 10 מ\"ש²?",
                quiz: [
                  { question: "מהו חוק ניוטון השני?", options: ["F = m/a", "F = m × a", "F = a/m", "F = m + a"], correct: 1 },
                ],
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
      {
        id: "sci-2", title: "חומר ואנרגיה", weight: "50%",
        description: "מצבי צבירה, תגובות כימיות, אנרגיה",
        units: [
          {
            id: "sci-2-1", title: "מצבי צבירה",
            items: [
              {
                id: "sci-2-1-1", title: "מוצק, נוזל וגז",
                explanation: "שלושת מצבי הצבירה:\n\n🧊 מוצק — צורה קבועה, נפח קבוע, חלקיקים צפופים\n💧 נוזל — צורה משתנה, נפח קבוע, חלקיקים זזים\n💨 גז — צורה ונפח משתנים, חלקיקים נעים חופשי\n\nמעברי מצב:\n• היתוך: מוצק → נוזל (חימום)\n• אידוי: נוזל → גז (חימום)\n• עיבוי: גז → נוזל (קירור)\n• קיפאון: נוזל → מוצק (קירור)",
                practice: "תאר מה קורה לקוביית קרח כשמחממים אותה לאט. התייחס לכל מעבר מצב.",
                quiz: [
                  { question: "מהו מעבר ממוצק לנוזל?", options: ["אידוי", "עיבוי", "היתוך", "קיפאון"], correct: 2 },
                ],
              },
            ],
          },
        ],
        materials: [],
        assignments: [],
      },
    ],
  },
};

// Helper: get flat topic names for a part (for progress tracking)
export const getPartTopicNames = (subjectName: string, partId: string): string[] => {
  const subject = courseContent[subjectName];
  if (!subject) return [];
  const part = subject.parts.find(p => p.id === partId);
  if (!part) return [];
  return part.units.flatMap(u => u.items.map(i => i.title));
};

// Helper: get all topic names for a subject
export const getSubjectTopicNames = (subjectName: string): string[] => {
  const subject = courseContent[subjectName];
  if (!subject) return [];
  return subject.parts.flatMap(p => p.units.flatMap(u => u.items.map(i => i.title)));
};
