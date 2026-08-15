import { useState, useEffect, useCallback } from "react";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export type FieldKind = "text" | "longtext" | "table" | "tagged-list" | "checklist";

export interface FieldDef {
  id: string;
  kind: FieldKind;
  label?: string;
  helper?: string;
  placeholder?: string;
  /** for tagged-list — initial labels (tags) */
  tags?: string[];
  /** for table */
  columns?: string[];
  rows?: number;
  /** for checklist */
  items?: string[];
  /** for AI check */
  expectation?: string;
  /** check question shown to AI */
  question?: string;
}

interface Props {
  itemId: string;
  fields: FieldDef[];
}

type AiResult = {
  status: "great" | "good" | "needs_work";
  headline: string;
  feedback: string;
  suggestions: string[];
};

const STATUS_STYLES: Record<AiResult["status"], { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  great: { bg: "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30", text: "text-[hsl(var(--success))]", icon: CheckCircle2 },
  good: { bg: "bg-primary/8 border-primary/25", text: "text-primary", icon: Sparkles },
  needs_work: { bg: "bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/30", text: "text-[hsl(var(--warning))]", icon: AlertCircle },
};

const storageKey = (itemId: string, fieldId: string) => `civ-ans:${itemId}:${fieldId}`;
const aiKey = (itemId: string, fieldId: string) => `civ-ai:${itemId}:${fieldId}`;

const loadStr = (k: string, fallback = "") => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
const loadJSON = <T,>(k: string, fallback: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

const StructuredPractice = ({ itemId, fields }: Props) => {
  return (
    <div className="space-y-3">
      {fields.map(f => <FieldRenderer key={f.id} itemId={itemId} field={f} />)}
    </div>
  );
};

const FieldRenderer = ({ itemId, field }: { itemId: string; field: FieldDef }) => {
  if (field.kind === "text") return <TextField itemId={itemId} field={field} />;
  if (field.kind === "longtext") return <LongTextField itemId={itemId} field={field} />;
  if (field.kind === "tagged-list") return <TaggedListField itemId={itemId} field={field} />;
  if (field.kind === "table") return <TableField itemId={itemId} field={field} />;
  if (field.kind === "checklist") return <ChecklistField itemId={itemId} field={field} />;
  return null;
};

/* ───────── AI feedback strip ───────── */

const useAiCheck = (itemId: string, field: FieldDef, getAnswer: () => string) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(() => loadJSON<AiResult | null>(aiKey(itemId, field.id), null));

  /* AI-check DEACTIVATED (product contract, 2026-08-15):
     AI feedback must never reach a student without teacher approval, and no
     approval mechanism exists yet. The previous behavior also sent student
     answers to an external AI gateway without an authorization gate. The
     call is blocked client-side until an approval flow ships; previously
     stored results still render, labeled as non-binding practice. */
  const run = useCallback(async () => {
    void getAnswer;
    void setLoading;
    void setResult;
    toast({
      title: "בדיקת ה־AI מושבתת בשלב זה",
      description: "משוב AI לתלמיד מחייב אישור מורה; הרכיב יחזור כשמנגנון האישור יחובר.",
    });
  }, [getAnswer]);

  return { loading, result, run };
};

const AiBar = ({ loading, result, onCheck }: { loading: boolean; result: AiResult | null; onCheck: () => void }) => (
  <div className="mt-2 space-y-2">
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onCheck}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-primary/80 hover:text-primary transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.8} /> : <Sparkles className="h-3 w-3" strokeWidth={1.8} />}
        בדיקת AI · מושבתת זמנית
      </button>
    </div>
    {result && (
      <>
        <p className="text-[10px] text-muted-foreground text-end">משוב תרגול שנשמר בעבר · אינו הערכה ואינו ציון</p>
        <AiFeedback result={result} />
      </>
    )}
  </div>
);

const AiFeedback = ({ result }: { result: AiResult }) => {
  const s = STATUS_STYLES[result.status];
  const Icon = s.icon;
  return (
    <div className={`rounded-xl border p-3 ${s.bg}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${s.text}`} strokeWidth={1.7} />
        <div className="flex-1 min-w-0">
          <p className={`text-[11.5px] font-semibold ${s.text}`}>{result.headline}</p>
          <p className="text-[11px] text-foreground/85 leading-relaxed mt-1">{result.feedback}</p>
          {result.suggestions?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.suggestions.map((sg, i) => (
                <li key={i} className="text-[10.5px] text-foreground/70 leading-relaxed pr-3 relative before:content-['•'] before:absolute before:right-0 before:text-primary/60">{sg}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

/* ───────── Field: short text ───────── */
const TextField = ({ itemId, field }: { itemId: string; field: FieldDef }) => {
  const [v, setV] = useState(() => loadStr(storageKey(itemId, field.id)));
  useEffect(() => { save(storageKey(itemId, field.id), v); }, [v, itemId, field.id]);
  const ai = useAiCheck(itemId, field, () => v);
  return (
    <div className="bg-card rounded-xl border border-border p-3.5 shadow-[var(--shadow-card)]">
      {field.label && <p className="text-[11.5px] font-semibold text-foreground mb-1.5">{field.label}</p>}
      {field.helper && <p className="text-[10.5px] text-muted-foreground mb-2 leading-relaxed">{field.helper}</p>}
      <Input value={v} onChange={e => setV(e.target.value)} placeholder={field.placeholder || "כתוב כאן…"} className="text-[12px] h-9 rounded-lg bg-muted/30 border-border/60" />
      <AiBar loading={ai.loading} result={ai.result} onCheck={ai.run} />
    </div>
  );
};

/* ───────── Field: long text ───────── */
const LongTextField = ({ itemId, field }: { itemId: string; field: FieldDef }) => {
  const [v, setV] = useState(() => loadStr(storageKey(itemId, field.id)));
  useEffect(() => { save(storageKey(itemId, field.id), v); }, [v, itemId, field.id]);
  const ai = useAiCheck(itemId, field, () => v);
  return (
    <div className="bg-card rounded-xl border border-border p-3.5 shadow-[var(--shadow-card)]">
      {field.label && <p className="text-[11.5px] font-semibold text-foreground mb-1.5">{field.label}</p>}
      {field.helper && <p className="text-[10.5px] text-muted-foreground mb-2 leading-relaxed whitespace-pre-wrap">{field.helper}</p>}
      <Textarea value={v} onChange={e => setV(e.target.value)} placeholder={field.placeholder || "כתבו את תשובתכם כאן…"} className="text-[11.5px] min-h-[100px] rounded-lg bg-muted/30 border-border/60 resize-y leading-relaxed" />
      <AiBar loading={ai.loading} result={ai.result} onCheck={ai.run} />
    </div>
  );
};

/* ───────── Field: tagged-list ─────────
   Like the reference video: each row is a labeled tag (concept) + an input;
   user can add custom items. */
const TaggedListField = ({ itemId, field }: { itemId: string; field: FieldDef }) => {
  type Row = { id: string; tag: string; value: string };
  const initial: Row[] = (field.tags || []).map((t, i) => ({ id: `t-${i}`, tag: t, value: "" }));
  const [rows, setRows] = useState<Row[]>(() => loadJSON<Row[]>(storageKey(itemId, field.id), initial));
  useEffect(() => { try { localStorage.setItem(storageKey(itemId, field.id), JSON.stringify(rows)); } catch {} }, [rows, itemId, field.id]);

  const getAnswer = () => rows.filter(r => r.value.trim()).map(r => `${r.tag}: ${r.value}`).join("\n");
  const ai = useAiCheck(itemId, field, getAnswer);

  const updateValue = (id: string, value: string) => setRows(p => p.map(r => r.id === id ? { ...r, value } : r));
  const updateTag = (id: string, tag: string) => setRows(p => p.map(r => r.id === id ? { ...r, tag } : r));
  const remove = (id: string) => setRows(p => p.filter(r => r.id !== id));
  const add = () => setRows(p => [...p, { id: `t-${Date.now()}`, tag: "פריט חדש", value: "" }]);

  return (
    <div className="bg-card rounded-xl border border-border p-3.5 shadow-[var(--shadow-card)]">
      {field.label && <p className="text-[11.5px] font-semibold text-foreground mb-1.5">{field.label}</p>}
      {field.helper && <p className="text-[10.5px] text-muted-foreground mb-3 leading-relaxed">{field.helper}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {rows.map(r => (
          <div key={r.id} className="bg-primary/[0.04] rounded-xl border border-primary/12 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <input
                value={r.tag}
                onChange={e => updateTag(r.id, e.target.value)}
                className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 outline-none w-auto min-w-[80px] text-center"
                style={{ width: `${Math.max(r.tag.length + 2, 8)}ch` }}
              />
              <button type="button" onClick={() => remove(r.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5">
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
            <Input
              value={r.value}
              onChange={e => updateValue(r.id, e.target.value)}
              placeholder={field.placeholder || r.tag}
              className="text-[11px] h-8 rounded-md bg-card border-border/50"
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-medium text-primary/70 hover:text-primary transition-colors">
        <Plus className="h-3 w-3" strokeWidth={1.7} /> הוסף פריט
      </button>
      <AiBar loading={ai.loading} result={ai.result} onCheck={ai.run} />
    </div>
  );
};

/* ───────── Field: table ───────── */
const TableField = ({ itemId, field }: { itemId: string; field: FieldDef }) => {
  const cols = field.columns || ["שם", "ערך"];
  const initialRows = field.rows ?? 3;
  type RowData = Record<number, string>;
  const blank = (): RowData => Object.fromEntries(cols.map((_, i) => [i, ""])) as RowData;
  const [rows, setRows] = useState<RowData[]>(() => loadJSON<RowData[]>(storageKey(itemId, field.id), Array.from({ length: initialRows }, blank)));
  useEffect(() => { try { localStorage.setItem(storageKey(itemId, field.id), JSON.stringify(rows)); } catch {} }, [rows, itemId, field.id]);

  const update = (ri: number, ci: number, v: string) => setRows(p => p.map((r, i) => i === ri ? { ...r, [ci]: v } : r));
  const addRow = () => setRows(p => [...p, blank()]);
  const removeRow = (ri: number) => setRows(p => p.filter((_, i) => i !== ri));

  const getAnswer = () =>
    rows.filter(r => Object.values(r).some(v => (v || "").trim()))
      .map(r => cols.map((c, i) => `${c}: ${r[i] || ""}`).join(" | "))
      .join("\n");

  const ai = useAiCheck(itemId, field, getAnswer);

  return (
    <div className="bg-card rounded-xl border border-border p-3.5 shadow-[var(--shadow-card)]">
      {field.label && <p className="text-[11.5px] font-semibold text-foreground mb-1.5">{field.label}</p>}
      {field.helper && <p className="text-[10.5px] text-muted-foreground mb-2 leading-relaxed">{field.helper}</p>}
      <div className="overflow-x-auto -mx-3.5 px-3.5">
        <table className="w-full text-[10.5px] border-separate border-spacing-y-1.5">
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} className="text-start text-[10px] font-semibold text-muted-foreground px-2 pb-1">{c}</th>
              ))}
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {cols.map((_, ci) => (
                  <td key={ci} className="align-top p-0">
                    <Input
                      value={r[ci] || ""}
                      onChange={e => update(ri, ci, e.target.value)}
                      className="text-[11px] h-8 rounded-md bg-muted/20 border-border/50 mx-0.5"
                    />
                  </td>
                ))}
                <td className="align-middle text-center">
                  <button type="button" onClick={() => removeRow(ri)} className="text-muted-foreground/30 hover:text-destructive transition-colors p-1">
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-medium text-primary/70 hover:text-primary transition-colors">
        <Plus className="h-3 w-3" strokeWidth={1.7} /> הוסף שורה
      </button>
      <AiBar loading={ai.loading} result={ai.result} onCheck={ai.run} />
    </div>
  );
};

/* ───────── Field: checklist (no AI needed) ───────── */
const ChecklistField = ({ itemId, field }: { itemId: string; field: FieldDef }) => {
  const items = field.items || [];
  const [checked, setChecked] = useState<Record<number, boolean>>(() => loadJSON<Record<number, boolean>>(storageKey(itemId, field.id), {}));
  useEffect(() => { try { localStorage.setItem(storageKey(itemId, field.id), JSON.stringify(checked)); } catch {} }, [checked, itemId, field.id]);
  const total = items.length;
  const done = Object.values(checked).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-3.5 shadow-[var(--shadow-card)]">
      {field.label && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11.5px] font-semibold text-foreground">{field.label}</p>
          <span className="text-[10px] font-semibold text-primary/70 tabular-nums">{done}/{total} · {pct}%</span>
        </div>
      )}
      {field.helper && <p className="text-[10.5px] text-muted-foreground mb-2 leading-relaxed">{field.helper}</p>}
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setChecked(p => ({ ...p, [i]: !p[i] }))}
              className={`w-full flex items-center gap-2 text-start px-2.5 py-2 rounded-lg border transition-all ${
                checked[i]
                  ? "bg-[hsl(var(--success))]/8 border-[hsl(var(--success))]/30 text-foreground"
                  : "bg-muted/20 border-border/40 hover:bg-muted/40"
              }`}
            >
              <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                checked[i] ? "bg-[hsl(var(--success))] border-[hsl(var(--success))]" : "border-border bg-card"
              }`}>
                {checked[i] && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />}
              </span>
              <span className={`text-[11px] flex-1 ${checked[i] ? "line-through text-muted-foreground" : "text-foreground"}`}>{it}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StructuredPractice;
