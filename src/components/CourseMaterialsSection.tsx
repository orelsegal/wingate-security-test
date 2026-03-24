import { useState } from "react";
import { Link as LinkIcon, Upload, FileText, Video, Plus, Trash2, ExternalLink, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export interface CourseMaterial {
  id: string;
  title: string;
  type: "link" | "file" | "video" | "doc";
  url?: string;
}

const typeIcons: Record<string, typeof LinkIcon> = {
  link: LinkIcon,
  file: Upload,
  video: Video,
  doc: FileText,
};

const typeLabels: Record<string, string> = {
  link: "קישור",
  file: "קובץ",
  video: "סרטון",
  doc: "מסמך",
};

const typeColors: Record<string, string> = {
  link: "bg-[hsl(210,40%,93%)] text-[hsl(210,45%,48%)]",
  file: "bg-[hsl(35,35%,93%)] text-[hsl(35,45%,42%)]",
  video: "bg-[hsl(350,25%,93%)] text-[hsl(350,40%,50%)]",
  doc: "bg-primary/8 text-primary",
};

interface Props {
  materials: CourseMaterial[];
  onUpdate?: (materials: CourseMaterial[]) => void;
  isTeacher: boolean;
  compact?: boolean;
}

export default function CourseMaterialsSection({ materials, onUpdate, isTeacher, compact }: Props) {
  const [items, setItems] = useState(materials);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<CourseMaterial["type"]>("link");

  const save = (updated: CourseMaterial[]) => {
    setItems(updated);
    onUpdate?.(updated);
  };

  const addItem = () => {
    if (!newTitle.trim()) return;
    const item: CourseMaterial = {
      id: `cm-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      url: newUrl.trim() || undefined,
    };
    save([...items, item]);
    setNewTitle("");
    setNewUrl("");
    setAdding(false);
    toast({ title: "חומר נוסף בהצלחה" });
  };

  const remove = (id: string) => {
    save(items.filter(m => m.id !== id));
    toast({ title: "חומר הוסר" });
  };

  if (items.length === 0 && !isTeacher) return null;

  return (
    <section className={compact ? "mb-4" : "mb-6"}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[12px] font-semibold text-primary/60 tracking-tight flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
          חומרי לימוד ומשאבים
        </h2>
        {isTeacher && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} />
            הוסף חומר
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && isTeacher && (
        <div className="bg-card rounded-xl border border-primary/15 p-3 mb-3 animate-fade-in-up">
          <div className="flex gap-2 mb-2 flex-wrap">
            {(["link", "file", "video", "doc"] as const).map(t => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`text-[9.5px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  newType === t ? "bg-primary/10 border-primary/20 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="text-[11px] h-8 mb-2 rounded-lg"
            placeholder="שם החומר"
          />
          <Input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="text-[11px] h-8 mb-2 rounded-lg"
            placeholder="קישור (URL) — אופציונלי"
            dir="ltr"
          />
          <div className="flex gap-2">
            <Button size="sm" className="text-[10px] h-7 rounded-lg" onClick={addItem}>הוסף</Button>
            <Button size="sm" variant="ghost" className="text-[10px] h-7 rounded-lg" onClick={() => setAdding(false)}>ביטול</Button>
          </div>
        </div>
      )}

      {/* Materials list */}
      <div className="flex flex-col gap-2">
        {items.map(mat => {
          const Icon = typeIcons[mat.type] || FileText;
          const colorClass = typeColors[mat.type] || typeColors.doc;
          return (
            <div key={mat.id} className="bg-card rounded-xl border border-border p-3 shadow-[var(--shadow-card)] flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate">{mat.title}</p>
                <p className="text-[9px] text-muted-foreground">{typeLabels[mat.type]}</p>
              </div>
              {mat.url && (
                <a
                  href={mat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                </a>
              )}
              {isTeacher && (
                <button
                  onClick={() => remove(mat.id)}
                  className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              )}
            </div>
          );
        })}

        {items.length === 0 && isTeacher && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="w-full bg-card rounded-xl border border-dashed border-primary/20 p-3 text-center hover:border-primary/40 hover:bg-primary/[0.03] transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-center gap-2 text-primary/50">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="text-[10.5px] font-medium">הוסף קישור, סרטון או קובץ</span>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
