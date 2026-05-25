import { useState, useMemo } from "react";
import { LOCAL_FONTS } from "@/config/localFontList";
import { Search } from "lucide-react";

interface Props {
  /** Called when the user picks a font */
  onSelect?: (family: string) => void;
  /** Currently selected font family */
  selected?: string;
  /** Preview text — defaults to Hebrew pangram */
  previewText?: string;
}

const DEFAULT_PREVIEW = "וינגייט — ספורט, מצוינות ולמידה";

export const FontPicker = ({ onSelect, selected, previewText = DEFAULT_PREVIEW }: Props) => {
  const [query, setQuery] = useState("");
  const [previewSize, setPreviewSize] = useState(24);

  const filtered = useMemo(() =>
    LOCAL_FONTS.filter(f =>
      f.family.toLowerCase().includes(query.toLowerCase())
    ), [query]);

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* ── Controls ── */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="חפש פונט..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full h-8 pr-9 pl-3 rounded-lg border border-border bg-card text-[12px] outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">{previewSize}px</span>
          <input
            type="range" min={14} max={60} value={previewSize}
            onChange={e => setPreviewSize(Number(e.target.value))}
            className="w-20 accent-primary"
          />
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{filtered.length} פונטים</span>
      </div>

      {/* ── Font list ── */}
      <div className="overflow-y-auto flex-1">
        {filtered.map(font => (
          <button
            key={font.family}
            onClick={() => onSelect?.(font.family)}
            className={`
              w-full text-right px-5 py-3.5 border-b border-border/50 transition-colors
              hover:bg-accent/40 flex flex-col gap-1
              ${selected === font.family ? "bg-primary/8 border-r-2 border-r-primary" : ""}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60 font-mono">{font.family}</span>
              <div className="flex gap-1">
                {font.weights.map(w => (
                  <span key={w} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <p
              className="text-foreground leading-tight text-right overflow-hidden whitespace-nowrap text-ellipsis w-full"
              style={{ fontFamily: `"${font.family}", sans-serif`, fontSize: previewSize }}
            >
              {previewText}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FontPicker;
