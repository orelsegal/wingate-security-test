/**
 * BuilderOverlay — global admin-only chrome for the Visual Builder.
 *
 * Renders:
 *  - Floating toolbar (edit mode / preview-as-role / structure / reset).
 *  - Right Settings panel (5 tabs) for the currently selected element.
 *  - Left Structure panel listing every EditableElement on the page.
 *
 * Mounted once at the AppLayout level. Renders nothing for non-admin users.
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Layers, MousePointerClick, Pencil, RotateCcw, X, Layout, Palette, Shield, Settings2, Type } from "lucide-react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { useBuilderUI, ELEMENT_TYPE_LABEL } from "@/context/BuilderUIContext";
import { useBuilderOverrides, type StylePreset } from "@/context/BuilderOverridesContext";
import { cn } from "@/lib/utils";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "מנהל" },
  { value: "teacher", label: "מורה" },
  { value: "parent", label: "הורה" },
  { value: "coach", label: "מאמן" },
  { value: "student", label: "תלמיד" },
];

const STYLE_OPTIONS: { value: StylePreset; label: string }[] = [
  { value: "default", label: "ברירת מחדל" },
  { value: "clean", label: "נקי" },
  { value: "bordered", label: "עם מסגרת" },
  { value: "elevated", label: "מוגבה" },
  { value: "highlighted", label: "מודגש" },
];

const BuilderOverlay = () => {
  const { user } = useAuth();
  const ui = useBuilderUI();
  const ov = useBuilderOverrides();

  if (user?.role !== "admin") return null;

  const selected = ui.selectedId ? ui.registry.find((r) => r.id === ui.selectedId) : null;
  const current = selected ? (ov.overrides[selected.id] ?? {}) : {};

  const update = (patch: Parameters<typeof ov.setOverride>[1]) => {
    if (selected) ov.setOverride(selected.id, patch);
  };

  const toggleRole = (role: UserRole) => {
    const list = current.roleVisibility ?? ROLES.map((r) => r.value);
    const next = list.includes(role) ? list.filter((r) => r !== role) : [...list, role];
    update({ roleVisibility: next });
  };

  return (
    <>
      {/* Floating toolbar */}
      <div
        className={cn(
          "fixed z-[60] bottom-5 start-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-2xl",
          "bg-card/95 backdrop-blur-md border border-border shadow-2xl",
        )}
        dir="rtl"
      >
        <Button
          size="sm"
          variant={ui.editMode ? "default" : "ghost"}
          onClick={() => { ui.setEditMode(!ui.editMode); if (ui.editMode) ui.select(null); }}
          className="h-8 gap-1.5 text-[12px]"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
          {ui.editMode ? "סיים עריכה" : "מצב עריכה"}
        </Button>

        {ui.editMode && (
          <>
            <div className="h-5 w-px bg-border mx-0.5" />
            <Button size="sm" variant="ghost" onClick={() => ui.setStructureOpen(true)} className="h-8 gap-1.5 text-[12px]">
              <Layers className="h-3.5 w-3.5" strokeWidth={1.8} />
              מבנה
            </Button>

            <div className="flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
              <span>צפייה כ:</span>
              <Select
                value={ui.previewRole ?? "__edit"}
                onValueChange={(v) => ui.setPreviewRole(v === "__edit" ? null : (v as UserRole))}
              >
                <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__edit">עריכה (מנהל)</SelectItem>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => { if (confirm("לאפס את כל ההתאמות?")) ov.resetAll(); }}
              className="h-8 gap-1.5 text-[12px] text-destructive hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
              איפוס הכל
            </Button>
          </>
        )}
      </div>

      {/* Structure panel (left) */}
      <Sheet open={ui.structureOpen} onOpenChange={ui.setStructureOpen}>
        <SheetContent side="left" className="w-[320px] sm:max-w-[320px]" dir="rtl">
          <SheetHeader>
            <SheetTitle className="text-[14px] font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4" strokeWidth={1.5} />
              מבנה העמוד
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)] pr-1">
            {ui.registry.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-4">אין רכיבים רשומים בעמוד זה.</p>
            ) : (
              ui.registry.map((e) => {
                const isSel = ui.selectedId === e.id;
                const hasOverride = !!ov.overrides[e.id];
                return (
                  <button
                    key={e.id}
                    onClick={() => { ui.select(e.id); ui.setStructureOpen(false); }}
                    className={cn(
                      "w-full text-start flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] transition-colors",
                      isSel ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground",
                    )}
                  >
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {ELEMENT_TYPE_LABEL[e.type]}
                    </span>
                    <span className="flex-1 truncate">{ov.overrides[e.id]?.label ?? e.defaultLabel}</span>
                    {hasOverride && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings panel (right) */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) ui.select(null); }}>
        <SheetContent side="right" className="w-[380px] sm:max-w-[380px] flex flex-col" dir="rtl">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="text-[10px] mb-1.5">{ELEMENT_TYPE_LABEL[selected.type]}</Badge>
                    <SheetTitle className="text-[14px] font-semibold truncate">
                      {current.label ?? selected.defaultLabel}
                    </SheetTitle>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="content" className="flex-1 flex flex-col mt-3 overflow-hidden">
                <TabsList className="grid grid-cols-5 h-9">
                  <TabsTrigger value="content" className="text-[11px]"><Type className="h-3 w-3 ms-1" />תוכן</TabsTrigger>
                  <TabsTrigger value="style" className="text-[11px]"><Palette className="h-3 w-3 ms-1" />סטייל</TabsTrigger>
                  <TabsTrigger value="layout" className="text-[11px]"><Layout className="h-3 w-3 ms-1" />פריסה</TabsTrigger>
                  <TabsTrigger value="perms" className="text-[11px]"><Shield className="h-3 w-3 ms-1" />הרשאות</TabsTrigger>
                  <TabsTrigger value="adv" className="text-[11px]"><Settings2 className="h-3 w-3 ms-1" />מתקדם</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1">
                  <TabsContent value="content" className="space-y-3 mt-0">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">טקסט / כותרת</Label>
                      <Input
                        value={current.label ?? selected.defaultLabel}
                        onChange={(e) => update({ label: e.target.value })}
                        className="mt-1 h-9 text-[13px]"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">כותרת משנה / תיאור</Label>
                      <Textarea
                        value={current.subtitle ?? ""}
                        onChange={(e) => update({ subtitle: e.target.value })}
                        className="mt-1 text-[12px] min-h-[60px]"
                        placeholder="ריק = שימוש בברירת המחדל"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">טקסט עזרה</Label>
                      <Input
                        value={current.helper ?? ""}
                        onChange={(e) => update({ helper: e.target.value })}
                        className="mt-1 h-9 text-[12px]"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">שם אייקון (Lucide)</Label>
                      <Input
                        value={current.iconName ?? ""}
                        onChange={(e) => update({ iconName: e.target.value })}
                        className="mt-1 h-9 text-[12px]"
                        placeholder="ריק = כברירת המחדל"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="style" className="space-y-3 mt-0">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">סגנון כרטיס</Label>
                      <Select
                        value={current.stylePreset ?? "default"}
                        onValueChange={(v) => update({ stylePreset: v as StylePreset })}
                      >
                        <SelectTrigger className="mt-1 h-9 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STYLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      בקרות נוספות (רקע, פינות, צל, צבע אייקון) יתווספו בשלב הבא.
                    </p>
                  </TabsContent>

                  <TabsContent value="layout" className="space-y-3 mt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[12px] font-medium">הצג רכיב</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {current.visible === false ? "מוסתר" : "מוצג"}
                        </p>
                      </div>
                      <Switch
                        checked={current.visible !== false}
                        onCheckedChange={(v) => update({ visible: v })}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">רוחב</Label>
                      <Select
                        value={current.layoutWidth ?? "full"}
                        onValueChange={(v) => update({ layoutWidth: v as any })}
                      >
                        <SelectTrigger className="mt-1 h-9 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">מלא</SelectItem>
                          <SelectItem value="half">חצי</SelectItem>
                          <SelectItem value="third">שליש</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">צפיפות</Label>
                      <Select
                        value={current.density ?? "regular"}
                        onValueChange={(v) => update({ density: v as any })}
                      >
                        <SelectTrigger className="mt-1 h-9 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">דחוס</SelectItem>
                          <SelectItem value="regular">רגיל</SelectItem>
                          <SelectItem value="expanded">מורחב</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">סדר בתוך הסקציה</Label>
                      <Input
                        type="number"
                        value={current.order ?? 0}
                        onChange={(e) => update({ order: Number(e.target.value) })}
                        className="mt-1 h-9 text-[12px]"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="perms" className="space-y-2 mt-0">
                    <p className="text-[11px] text-muted-foreground mb-2">
                      בחר אילו תפקידים יראו את הרכיב. ברירת המחדל: כולם.
                    </p>
                    {ROLES.map((r) => {
                      const list = current.roleVisibility ?? ROLES.map((x) => x.value);
                      const checked = list.includes(r.value);
                      return (
                        <label key={r.value} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
                          <span className="text-[12.5px]">{r.label}</span>
                          <Checkbox checked={checked} onCheckedChange={() => toggleRole(r.value)} />
                        </label>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="adv" className="space-y-3 mt-0">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">מזהה רכיב</Label>
                      <Input value={selected.id} readOnly className="mt-1 h-9 text-[11px] font-mono" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">עמוד</Label>
                      <Input value={selected.pageKey} readOnly className="mt-1 h-9 text-[11px] font-mono" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => { ov.resetOverride(selected.id); }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                      איפוס רכיב זה
                    </Button>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Selection hint */}
      {ui.editMode && !selected && (
        <div className="fixed z-[55] top-3 start-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-card/90 border border-border shadow text-[11px] text-muted-foreground flex items-center gap-1.5" dir="rtl">
          <MousePointerClick className="h-3 w-3" strokeWidth={1.8} />
          לחץ על רכיב כדי לערוך אותו
        </div>
      )}
    </>
  );
};

export default BuilderOverlay;
