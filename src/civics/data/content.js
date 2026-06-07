// ═══════════════════════════════════════════════════════════════
//  CIVICS CONTENT — Single source of truth for the civics research unit.
//  Mirrors the structure of src/larutz/data/content.js but adapted
//  for the civics 30% performance task (6 research stages).
// ═══════════════════════════════════════════════════════════════

export const CIVICS_STATIONS = [
  { id: 1, emoji: '🎯', title: 'בחירת בעיה',          subtitle: 'מה מטריד אותך באזרחות?',  skills: ['בחירת נושא', 'ניסוח בעיה'],          color: 'teal'    },
  { id: 2, emoji: '🧭', title: 'מושגים ושאלת חקר',    subtitle: 'מהשטח אל הספר',           skills: ['מושגים', 'שאלת חקר'],                color: 'cyan'    },
  { id: 3, emoji: '📚', title: 'סקירת מקורות',         subtitle: 'מה כבר נכתב על זה?',      skills: ['סקירת ספרות', 'אמינות מקור'],        color: 'indigo'  },
  { id: 4, emoji: '🔬', title: 'איסוף נתונים',         subtitle: 'שאלון, ראיון, תצפית',     skills: ['כלי מחקר', 'איסוף נתונים'],          color: 'violet'  },
  { id: 5, emoji: '📊', title: 'ניתוח ומסקנות',        subtitle: 'מה הנתונים מספרים?',      skills: ['ניתוח', 'מסקנות'],                   color: 'amber'   },
  { id: 6, emoji: '📨', title: 'תוצר ורפלקציה',         subtitle: 'איך משפיעים בפועל?',      skills: ['תוצר', 'רפלקציה והגשה'],             color: 'emerald' },
];

// ── Station 1: bank of civic issues ──
export const CIVIC_ISSUES = [
  'אלימות נוער', 'פערים חברתיים', 'זכויות בעלי חיים', 'איכות הסביבה',
  'חופש הביטוי ברשת', 'זכויות עובדים צעירים', 'נגישות במרחב הציבורי',
  'חינוך לאזרחות', 'גזענות', 'שוויון מגדרי', 'דיור בר־השגה', 'תחבורה ציבורית',
  'בריאות הנפש', 'דמוקרטיה דיגיטלית', 'זכויות מיעוטים',
];

// ── Station 2: key civic concepts ──
export const CIVIC_CONCEPTS = [
  { id: 'rights',       term: 'זכויות אדם',         def: 'זכויות בסיסיות המוקנות לכל אדם מתוקף היותו אדם.' },
  { id: 'democracy',    term: 'דמוקרטיה',           def: 'משטר שבו הריבונות נתונה בידי האזרחים.' },
  { id: 'rule-of-law',  term: 'שלטון החוק',         def: 'עקרון שלפיו כל אדם, גם השלטון, כפוף לחוק.' },
  { id: 'pluralism',    term: 'פלורליזם',           def: 'הכרה בריבוי דעות, תרבויות וזהויות בחברה.' },
  { id: 'civil-society',term: 'חברה אזרחית',         def: 'ארגונים, עמותות ותנועות הפועלים מחוץ למדינה לקידום שינוי.' },
  { id: 'majority',     term: 'הכרעת הרוב',          def: 'עקרון שלפיו ההחלטה הקובעת היא של הרוב, תוך הגנה על המיעוט.' },
  { id: 'minority',     term: 'הגנה על המיעוט',     def: 'חובת המדינה לשמור על זכויות קבוצות שאינן בעמדת רוב.' },
  { id: 'separation',   term: 'הפרדת רשויות',        def: 'חלוקת הסמכויות בין מחוקקת, מבצעת ושופטת.' },
];

// ── Station 3: source types & credibility ──
export const SOURCE_TYPES = [
  { id: 'law',      icon: '⚖️', title: 'חוק / פסיקה',           note: 'מקור ראשוני — אמינות גבוהה' },
  { id: 'gov',      icon: '🏛️', title: 'אתר ממשלתי / דו״ח רשמי', note: 'מקור רשמי — לבדוק עדכניות' },
  { id: 'academic', icon: '🎓', title: 'מאמר אקדמי',             note: 'נבדק עמיתים — אמין מאוד' },
  { id: 'news',     icon: '📰', title: 'כתבה עיתונאית',           note: 'לבדוק מי הגוף ומגמה' },
  { id: 'ngo',      icon: '🤝', title: 'דו״ח עמותה / ארגון',     note: 'לבדוק עמדה ומימון' },
  { id: 'social',   icon: '📱', title: 'רשת חברתית',              note: 'אנקדוטלי — לא להסתמך כמקור יחיד' },
];

// ── Station 4: research tools ──
export const RESEARCH_TOOLS = [
  { id: 'survey',    icon: '📋', title: 'שאלון',     desc: 'אוסף נתונים כמותיים מהרבה אנשים' },
  { id: 'interview', icon: '🎙️', title: 'ראיון',     desc: 'מעמיק בעמדה של אדם בודד' },
  { id: 'observe',   icon: '👁️', title: 'תצפית',     desc: 'מתעדים התנהגות במציאות' },
  { id: 'analysis',  icon: '🔍', title: 'ניתוח מסמך', desc: 'בודקים טקסט קיים (חוק, כתבה, נאום)' },
];

// ── Station 6: action formats ──
export const ACTION_FORMATS = [
  { id: 'petition',  icon: '✊', title: 'עצומה / קמפיין' },
  { id: 'letter',    icon: '✉️', title: 'מכתב לראש רשות' },
  { id: 'video',     icon: '🎬', title: 'סרטון הסברה' },
  { id: 'event',     icon: '🎤', title: 'אירוע / הרצאה בקהילה' },
  { id: 'policy',    icon: '📜', title: 'הצעת מדיניות' },
  { id: 'social',    icon: '📱', title: 'קמפיין ברשתות' },
];
