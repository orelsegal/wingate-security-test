/**
 * Literature30RoadmapPage — מפת הדרכים (סצנית) של ספרות 30%
 * שואבת את 10 התחנות של "לרוץ עם מילים" מ-src/larutz/data/content.js
 * ומציגה אותן ב-ScenicRoadmap. לחיצה על תחנה פותחת את הלראוץ בתחנה הנכונה.
 */
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import ScenicRoadmap, { ScenicNode } from "@/components/ScenicRoadmap";
import { NOVEL_STATIONS } from "@/larutz/data/content.js";

const Literature30RoadmapPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(subjectName || "ספרות");
  const decoded = decodeURIComponent(subjectName || "ספרות");

  // Read progress straight from the localStorage keys that LarutzBridge writes,
  // so the roadmap reflects work students already did inside the larutz app.
  let completed: Record<string, boolean> = {};
  try {
    completed = JSON.parse(localStorage.getItem("mlri2-done") || "{}");
  } catch {
    completed = {};
  }

  // Find first not-done station = current
  const firstNotDoneIdx = NOVEL_STATIONS.findIndex((s: any) => !completed[`station-${s.id}`]);
  const currentIdx = firstNotDoneIdx === -1 ? NOVEL_STATIONS.length - 1 : firstNotDoneIdx;

  const nodes: ScenicNode[] = NOVEL_STATIONS.map((s: any, i: number) => {
    const done = Boolean(completed[`station-${s.id}`]);
    let status: ScenicNode["status"];
    if (done) status = "done";
    else if (i === currentIdx) status = "current";
    else if (i < currentIdx) status = "available";
    else status = "available"; // keep all open — no hard gating
    return {
      id: String(s.id),
      title: `${s.emoji} ${s.title}`,
      subtitle: s.subtitle,
      meta: s.skills?.[0],
      status,
    };
  });

  const goToStation = (idx: number) => {
    const station = NOVEL_STATIONS[idx];
    navigate(
      `/subjects/${encodeURIComponent(decoded)}/assessment-30/larutz-im-milim?page=station-${station.id}`,
    );
  };

  const continueToCurrent = () => goToStation(currentIdx);

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto" dir="rtl">
      {/* Breadcrumb */}
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
        <span className="text-foreground font-semibold">הערכה פנימית 30% · מפת הדרכים</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight leading-tight font-heading">
          לרוץ עם מילים — מפת הדרכים
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-1.5">
          10 תחנות סביב הרומן "מישהו לרוץ איתו" · מסע מלא מהכרת היצירה ועד רפלקציה והגשה
        </p>
      </div>

      <ScenicRoadmap
        nodes={nodes}
        onSelect={goToStation}
        onContinue={continueToCurrent}
        continueLabel="המשך לתחנה הבאה"
      />
    </div>
  );
};

export default Literature30RoadmapPage;
