/**
 * Literature70RoadmapPage — מפת דרכים סצנית של ספרות 70%
 * מבוססת על תוכן מהאתר seferut-bagrut.vercel.app — 8 יחידות בגרות.
 */
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import ScenicRoadmap, { ScenicNode } from "@/components/ScenicRoadmap";
import units from "@/lib/literature70Units.json";

type Unit = {
  id: string;
  number: number;
  title: string;
  author: string;
  type: string;
};

const Literature70RoadmapPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(subjectName || "ספרות");

  let completed: Record<string, boolean> = {};
  try {
    completed = JSON.parse(localStorage.getItem("lit70-done") || "{}");
  } catch {
    completed = {};
  }

  const firstNotDone = (units as Unit[]).findIndex((u) => !completed[u.id]);
  const currentIdx = firstNotDone === -1 ? units.length - 1 : firstNotDone;

  const nodes: ScenicNode[] = (units as Unit[]).map((u, i) => {
    const done = Boolean(completed[u.id]);
    const status: ScenicNode["status"] = done
      ? "done"
      : i === currentIdx
        ? "current"
        : "available";
    return {
      id: u.id,
      title: u.title,
      subtitle: u.author,
      meta: u.type,
      status,
    };
  });

  const goToUnit = (idx: number) => {
    const u = (units as Unit[])[idx];
    navigate(
      `/subjects/${encodeURIComponent(decoded)}/literature/70/${encodeURIComponent(u.id)}`,
    );
  };

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto" dir="rtl">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-5 flex-wrap">
        <button
          onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/literature`)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          חזרה ל{decoded}
        </button>
        <span className="text-border">|</span>
        <span>{decoded}</span>
        <span>›</span>
        <span className="text-foreground font-semibold">בגרות חיצונית 70% · מפת הדרכים</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight leading-tight font-heading">
          ספרות לבגרות — 70%
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-1.5">
          8 יחידות לימוד · פרוזה, שירה ודרמה · מסע מלא מהיכרות עם היצירה ועד תשובת בגרות
        </p>
      </div>

      <ScenicRoadmap
        nodes={nodes}
        onSelect={goToUnit}
        onContinue={() => goToUnit(currentIdx)}
        continueLabel="המשך ליחידה הבאה"
      />
    </div>
  );
};

export default Literature70RoadmapPage;
