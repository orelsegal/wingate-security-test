import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_ROLES, BuilderField, FIELD_TYPE_LABELS, FieldType, useBuilder } from "@/context/BuilderContext";
import { roleLabels, UserRole } from "@/context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  sectionId: string;
  field?: BuilderField; // edit if provided, otherwise create
}

const emptyField = (): Omit<BuilderField, "id"> => ({
  key: "", label: "", type: "text", required: false, placeholder: "",
  defaultValue: "", options: [], visibleRoles: [...ALL_ROLES], editRoles: ["admin", "teacher"],
});

export const FieldEditorModal = ({ open, onClose, sectionId, field }: Props) => {
  const { addField, updateField, layout } = useBuilder();
  const [state, setState] = useState<Omit<BuilderField, "id">>(emptyField());
  const [optionsText, setOptionsText] = useState("");
  const [sectionTarget, setSectionTarget] = useState<string>(sectionId);

  useEffect(() => {
    if (open) {
      setState(field ? { ...field } : emptyField());
      setOptionsText(field?.options?.join("\n") || "");
      setSectionTarget(sectionId);
    }
  }, [open, field, sectionId]);

  const needsOptions = state.type === "dropdown" || state.type === "multi-select";

  const handleSave = () => {
    if (!state.label.trim()) return;
    const key = (state.key || state.label).trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const final: Omit<BuilderField, "id"> = {
      ...state, key,
      options: needsOptions ? optionsText.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
    };
    if (field) updateField(sectionId, field.id, final);
    else addField(sectionTarget, final);
    onClose();
  };

  const toggleRole = (arr: UserRole[], r: UserRole) =>
    arr.includes(r) ? arr.filter((x) => x !== r) : [...arr, r];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{field ? "עריכת שדה" : "הוספת שדה חדש"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>תווית (label)</Label>
            <Input value={state.label} onChange={(e) => setState({ ...state, label: e.target.value })} placeholder="לדוגמה: הערות אישיות" />
          </div>
          <div>
            <Label>מפתח שדה (אופציונלי)</Label>
            <Input value={state.key} onChange={(e) => setState({ ...state, key: e.target.value })} placeholder="ייווצר אוטומטית" />
          </div>
          <div>
            <Label>סוג שדה</Label>
            <Select value={state.type} onValueChange={(v) => setState({ ...state, type: v as FieldType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!field && (
            <div>
              <Label>סקציה</Label>
              <Select value={sectionTarget} onValueChange={setSectionTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {layout.sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsOptions && (
            <div>
              <Label>אופציות (שורה לכל ערך)</Label>
              <Textarea rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </div>
          )}
          <div>
            <Label>טקסט עזר / placeholder</Label>
            <Input value={state.placeholder || ""} onChange={(e) => setState({ ...state, placeholder: e.target.value })} />
          </div>
          <div>
            <Label>ערך ברירת מחדל</Label>
            <Input value={state.defaultValue ?? ""} onChange={(e) => setState({ ...state, defaultValue: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <Checkbox checked={!!state.required} onCheckedChange={(c) => setState({ ...state, required: !!c })} />
            שדה חובה
          </label>

          <div>
            <Label className="block mb-2">נראה לתפקידים</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <button type="button" key={r} onClick={() => setState({ ...state, visibleRoles: toggleRole(state.visibleRoles, r) })}
                  className={`px-2.5 py-1 rounded-md text-[12px] border ${state.visibleRoles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="block mb-2">ניתן לעריכה ע״י</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <button type="button" key={r} onClick={() => setState({ ...state, editRoles: toggleRole(state.editRoles, r) })}
                  className={`px-2.5 py-1 rounded-md text-[12px] border ${state.editRoles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave}>שמור שדה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
