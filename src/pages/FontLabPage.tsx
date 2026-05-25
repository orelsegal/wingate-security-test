import { useState } from "react";
import { FontPicker } from "@/components/FontPicker";
import { Copy, Check } from "lucide-react";

const FontLabPage = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("וינגייט — ספורט, מצוינות ולמידה");
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      {/* ── Left panel: picker ── */}
      <div className="w-[380px] shrink-0 border-l border-border flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h1 className="text-[15px] font-semibold text-foreground">ספריית פונטים</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">189 משפחות · 406 קבצים</p>
        </div>
        <FontPicker
          selected={selected ?? undefined}
          onSelect={setSelected}
          previewText={previewText}
        />
      </div>

      {/* ── Right panel: detail / code ── */}
      <div className="flex-1 flex flex-col p-8 overflow-auto">
        {selected ? (
          <>
            {/* Font name + copy */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-[22px] font-semibold text-foreground" style={{ fontFamily: `"${selected}", sans-serif` }}>
                {selected}
              </h2>
              <button
                onClick={() => copy(selected)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                {copied ? "הועתק" : "העתק שם"}
              </button>
            </div>

            {/* Editable preview */}
            <div className="card-premium p-6 mb-6">
              <p className="text-[11px] text-muted-foreground mb-3">טקסט תצוגה מקדימה</p>
              <textarea
                value={previewText}
                onChange={e => setPreviewText(e.target.value)}
                className="w-full bg-transparent border-0 outline-none resize-none text-[11px] text-muted-foreground mb-4"
                rows={1}
              />
              <p
                className="text-[42px] leading-tight text-foreground"
                style={{ fontFamily: `"${selected}", sans-serif` }}
              >
                {previewText}
              </p>
            </div>

            {/* Size previews */}
            <div className="card-premium p-6 mb-6">
              <p className="text-[11px] text-muted-foreground mb-4">גדלים</p>
              {[72, 48, 36, 28, 22, 16, 13, 11].map(size => (
                <div key={size} className="flex items-baseline gap-4 py-2 border-b border-border/40 last:border-0">
                  <span className="text-[10px] text-muted-foreground/50 w-8 shrink-0">{size}px</span>
                  <span
                    className="text-foreground overflow-hidden whitespace-nowrap text-ellipsis"
                    style={{ fontFamily: `"${selected}", sans-serif`, fontSize: size }}
                  >
                    {previewText}
                  </span>
                </div>
              ))}
            </div>

            {/* Code snippets */}
            <div className="card-premium p-6">
              <p className="text-[11px] text-muted-foreground mb-4">שימוש בקוד</p>
              <div className="space-y-3">
                {[
                  { label: "CSS", code: `font-family: "${selected}", sans-serif;` },
                  { label: "Tailwind style prop", code: `style={{ fontFamily: '"${selected}", sans-serif' }}` },
                  { label: "Tailwind class (אחרי הוספה ל-config)", code: `font-${selected.toLowerCase().replace(/\s+/g, "-")}` },
                ].map(({ label, code }) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground/60 mb-1">{label}</p>
                    <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2">
                      <code className="text-[11px] text-foreground/80 font-mono flex-1 overflow-auto">{code}</code>
                      <button
                        onClick={() => copy(code)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[42px] mb-4">🔤</p>
              <p className="text-[15px] font-medium text-foreground">בחר פונט מהרשימה</p>
              <p className="text-[12px] text-muted-foreground mt-1">189 משפחות זמינות מהמחשב שלך</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FontLabPage;
