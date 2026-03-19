import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "number" | "textarea";
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  min?: number;
  max?: number;
  editable?: boolean;
}

export function InlineEdit({ value, onSave, type = "text", placeholder = "—", className, displayClassName, min, max, editable = true }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleSave = () => {
    if (type === "number" && draft) {
      const n = parseFloat(draft);
      if (min !== undefined && n < min) return;
      if (max !== undefined && n > max) return;
    }
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => { setDraft(value); setEditing(false); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (!editable) {
    return <span className={cn("text-[13px] text-foreground", displayClassName)}>{value || <span className="text-muted-foreground/50">{placeholder}</span>}</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn(
          "group inline-flex items-center gap-1.5 text-[13px] text-foreground hover:text-primary transition-colors rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-primary/5 min-w-0 text-start",
          displayClassName
        )}
      >
        <span className="truncate">{value || <span className="text-muted-foreground/50">{placeholder}</span>}</span>
        <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {type === "textarea" ? (
        <textarea
          ref={inputRef as any}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[60px] px-2.5 py-1.5 text-[13px] rounded-lg border border-primary/30 bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          placeholder={placeholder}
        />
      ) : (
        <input
          ref={inputRef as any}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          className="w-full px-2.5 py-1 text-[13px] rounded-lg border border-primary/30 bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={placeholder}
        />
      )}
      <button onClick={handleSave} className="p-1 rounded-md hover:bg-success/10 text-success transition-colors"><Check className="h-3.5 w-3.5" /></button>
      <button onClick={handleCancel} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground transition-colors"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

interface InlineSelectProps {
  value: string;
  options: { value: string; label: string; color?: string }[];
  onSave: (value: string) => void;
  editable?: boolean;
  displayClassName?: string;
}

export function InlineSelect({ value, options, onSave, editable = true, displayClassName }: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editable) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[13px]", displayClassName)}>
        {current?.color && <span className={`w-2 h-2 rounded-full ${current.color}`} />}
        {current?.label || value || "—"}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "group inline-flex items-center gap-1.5 text-[13px] text-foreground hover:text-primary transition-colors rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-primary/5",
          displayClassName
        )}
      >
        {current?.color && <span className={`w-2 h-2 rounded-full ${current.color}`} />}
        <span>{current?.label || value || "—"}</span>
        <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 start-0 min-w-[140px] bg-card border border-border rounded-xl shadow-lg p-1 animate-in fade-in-0 zoom-in-95 duration-150">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSave(opt.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors text-start",
                opt.value === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {opt.color && <span className={`w-2 h-2 rounded-full ${opt.color}`} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChipEditorProps {
  items: string[];
  onSave: (items: string[]) => void;
  editable?: boolean;
  chipColor?: string;
  placeholder?: string;
}

export function ChipEditor({ items, onSave, editable = true, chipColor = "bg-warning/10 text-warning", placeholder = "הוסף פריט..." }: ChipEditorProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (trimmed && !items.includes(trimmed)) {
      onSave([...items, trimmed]);
    }
    setDraft("");
    setAdding(false);
  };

  const handleRemove = (item: string) => {
    onSave(items.filter(i => i !== item));
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {items.map(item => (
        <span key={item} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium ${chipColor}`}>
          {item}
          {editable && (
            <button onClick={() => handleRemove(item)} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
          )}
        </span>
      ))}
      {editable && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
        >
          + הוסף
        </button>
      )}
      {adding && (
        <div className="inline-flex items-center gap-1">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
            className="w-24 px-2 py-1 text-[12px] rounded-lg border border-primary/30 bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={placeholder}
          />
          <button onClick={handleAdd} className="p-0.5 rounded text-success hover:bg-success/10"><Check className="h-3 w-3" /></button>
          <button onClick={() => { setAdding(false); setDraft(""); }} className="p-0.5 rounded text-muted-foreground hover:bg-accent"><X className="h-3 w-3" /></button>
        </div>
      )}
    </div>
  );
}
