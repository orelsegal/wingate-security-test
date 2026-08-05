import { Link } from "react-router-dom";
import { PageTitle, PlusCard } from "../components/PlusUI";

const LINKS = [
  { to: "/plus/goals", emoji: "🎯", title: "מטרות וחיסכון", detail: "עד שלוש מטרות פעילות, כולל כרית ביטחון" },
  { to: "/plus/lab", emoji: "🧪", title: "מעבדת השקעות", detail: "סימולטור לימודי — ריבית דריבית, עמלות ותרחישים" },
  { to: "/plus/parents", emoji: "👨‍👩‍👧", title: "עם ההורים", detail: "שיחות ופעולות משותפות + מצב הורה" },
  { to: "/plus/rights", emoji: "⚖️", title: "זכויות ובטיחות", detail: "מה מגיע לך לפי החוק, עם תאריכי עדכון" },
  { to: "/plus/achievements", emoji: "🏅", title: "הישגים", detail: "פעולות בריאות בלבד — בלי תחרות" },
  { to: "/plus/settings", emoji: "⚙️", title: "הגדרות ונתונים", detail: "חלוקת הכנסה, ייצוא ומחיקת נתונים" },
];

export default function MorePage() {
  return (
    <div className="space-y-4">
      <PageTitle title="עוד בפלוס" />
      <ul className="space-y-2">
        {LINKS.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="block">
              <PlusCard>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="text-xl">{link.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{link.title}</p>
                    <p className="text-xs text-muted-foreground">{link.detail}</p>
                  </div>
                  <span aria-hidden className="ms-auto text-muted-foreground">‹</span>
                </div>
              </PlusCard>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-muted-foreground">
        פלוס — הכסף שלך. הדרך שלך. העתיד שלך. · הנתונים נשמרים במכשיר בלבד, בלי
        מעקב ובלי פרסומות.
      </p>
    </div>
  );
}
