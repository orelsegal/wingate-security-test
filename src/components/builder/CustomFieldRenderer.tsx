import { useState } from "react";
import { BuilderField } from "@/context/BuilderContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Props {
  field: BuilderField;
  value: any;
  onSave: (value: any) => void;
  editable: boolean;
}

/** Renders an admin-defined custom field as either a read-only display or an editor. */
export const CustomFieldRenderer = ({ field, value, onSave, editable }: Props) => {
  const [local, setLocal] = useState<any>(value ?? field.defaultValue ?? "");
  const dirty = JSON.stringify(local) !== JSON.stringify(value ?? field.defaultValue ?? "");

  const display = () => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-muted-foreground/60 text-[13px]">—</span>;
    }
    if (field.type === "checkbox") return <span className="text-[13px]">{value ? "כן" : "לא"}</span>;
    if (field.type === "multi-select") return <span className="text-[13px]">{(value as string[]).join(", ")}</span>;
    if (field.type === "status") {
      const map: any = { green: "במסלול", yellow: "פערים", red: "בסיכון" };
      return <span className="text-[13px]">{map[value] || value}</span>;
    }
    return <span className="text-[13px]">{String(value)}</span>;
  };

  if (!editable) return <div className="py-1">{display()}</div>;

  const commit = () => onSave(local);

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-2">
          <Textarea value={local} placeholder={field.placeholder} onChange={(e) => setLocal(e.target.value)} />
          {dirty && <Button size="sm" onClick={commit}>שמור</Button>}
        </div>
      );
    case "number":
      return (
        <div className="flex gap-2">
          <Input type="number" value={local} placeholder={field.placeholder} onChange={(e) => setLocal(e.target.value === "" ? "" : Number(e.target.value))} />
          {dirty && <Button size="sm" onClick={commit}>שמור</Button>}
        </div>
      );
    case "date":
      return (
        <div className="flex gap-2">
          <Input type="date" value={local} onChange={(e) => setLocal(e.target.value)} />
          {dirty && <Button size="sm" onClick={commit}>שמור</Button>}
        </div>
      );
    case "dropdown":
    case "status": {
      const opts = field.type === "status"
        ? [{ v: "green", l: "במסלול" }, { v: "yellow", l: "פערים" }, { v: "red", l: "בסיכון" }]
        : (field.options || []).map((o) => ({ v: o, l: o }));
      return (
        <Select value={local || ""} onValueChange={(v) => { setLocal(v); onSave(v); }}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || "בחר"} /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    case "multi-select": {
      const selected: string[] = Array.isArray(local) ? local : [];
      const toggle = (opt: string) => {
        const next = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt];
        setLocal(next); onSave(next);
      };
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map((opt) => {
            const on = selected.includes(opt);
            return (
              <button key={opt} type="button" onClick={() => toggle(opt)}
                className={`px-2.5 py-1 rounded-md text-[12px] border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <Checkbox checked={!!local} onCheckedChange={(c) => { setLocal(!!c); onSave(!!c); }} />
          {field.placeholder || "מסומן"}
        </label>
      );
    case "file":
      return (
        <Input type="file" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setLocal(f.name); onSave(f.name); }
        }} />
      );
    case "user-relation":
    case "subject-relation":
    case "sport-relation":
    case "text":
    default:
      return (
        <div className="flex gap-2">
          <Input value={local} placeholder={field.placeholder} onChange={(e) => setLocal(e.target.value)} />
          {dirty && <Button size="sm" onClick={commit}>שמור</Button>}
        </div>
      );
  }
};
