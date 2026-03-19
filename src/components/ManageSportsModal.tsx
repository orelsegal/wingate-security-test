import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSports, useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ManageSportsModal({ open, onClose }: Props) {
  const { data: sports = [], isLoading } = useSports();
  const { data: students = [] } = useStudents();
  const queryClient = useQueryClient();
  const [newSport, setNewSport] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newSport.trim()) return;
    setSaving(true);
    const { error } = await (supabase.from("sports" as any) as any).insert({ sport_name: newSport.trim() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`ענף "${newSport.trim()}" נוסף`);
    setNewSport("");
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await (supabase.from("sports" as any) as any).update({ sport_name: editName.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("שם הענף עודכן");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const linkedStudents = students.filter(s => s.sport === deleteTarget.sport_name);
    if (linkedStudents.length > 0) {
      toast.error(`לא ניתן למחוק — ${linkedStudents.length} ספורטאים משויכים לענף זה`);
      setDeleteTarget(null);
      return;
    }
    const { error } = await (supabase.from("sports" as any) as any).delete().eq("id", deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`ענף "${deleteTarget.sport_name}" נמחק`);
    setDeleteTarget(null);
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  const handleToggleActive = async (sport: any) => {
    const { error } = await (supabase.from("sports" as any) as any).update({ active: !sport.active }).eq("id", sport.id);
    if (error) { toast.error(error.message); return; }
    toast.success(sport.active ? "ענף הועבר לארכיון" : "ענף שוחזר");
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ניהול ענפי ספורט</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Add new */}
            <div className="flex gap-2">
              <Input value={newSport} onChange={(e) => setNewSport(e.target.value)} placeholder="שם ענף חדש..." onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
              <Button onClick={handleAdd} disabled={saving} size="icon" className="shrink-0">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : sports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין ענפים עדיין</p>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {sports.map((sport: any) => {
                  const linkedCount = students.filter(s => s.sport === sport.sport_name).length;
                  const isEditing = editingId === sport.id;
                  return (
                    <div key={sport.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${sport.active === false ? "opacity-50 bg-muted/30 border-border" : "bg-card border-border"}`}>
                      {isEditing ? (
                        <>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRename(sport.id)} />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(sport.id)}><Check className="h-3.5 w-3.5 text-success" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium">{sport.sport_name}</span>
                          <span className="text-[10px] text-muted-foreground">{linkedCount} ספורטאים</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(sport.id); setEditName(sport.sport_name); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleActive(sport)}>
                            {sport.active === false ? <Check className="h-3 w-3 text-success" /> : <X className="h-3 w-3 text-warning" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(sport)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="מחיקת ענף ספורט"
        description={`האם למחוק את הענף "${deleteTarget?.sport_name}"? פעולה זו אינה ניתנת לביטול.`}
        confirmLabel="מחק"
        destructive
      />
    </>
  );
}
