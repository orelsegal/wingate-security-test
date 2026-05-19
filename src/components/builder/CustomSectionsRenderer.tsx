import { useEffect } from "react";
import { useBuilder, BuilderSection } from "@/context/BuilderContext";
import { useAuth } from "@/context/AuthContext";
import { useEditMode } from "@/context/EditModeContext";
import { CustomFieldRenderer } from "./CustomFieldRenderer";

/**
 * Renders the admin-defined (non-system) sections on the student profile.
 * Honors role visibility and per-field edit permissions.
 * Builder Mode (admin + edit) shows section/field controls inline via the BuilderPanel.
 */
export const CustomSectionsRenderer = ({ studentId }: { studentId: string }) => {
  const { user } = useAuth();
  const { canEdit } = useEditMode();
  const { layout, values, loadValues, setValue } = useBuilder();

  useEffect(() => { if (studentId) loadValues(studentId); }, [studentId, loadValues]);

  if (!user) return null;
  const role = user.role;

  const sections = layout.sections.filter((s) => !s.system && s.visible && s.visibleRoles.includes(role));
  if (sections.length === 0) return null;

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <CustomSectionBlock key={s.id} section={s} studentId={studentId}
          role={role} canEdit={canEdit}
          values={values} onSetValue={(k, v) => setValue(studentId, k, v)} />
      ))}
    </div>
  );
};

const CustomSectionBlock = ({
  section, role, canEdit, values, onSetValue,
}: {
  section: BuilderSection;
  studentId: string;
  role: string;
  canEdit: boolean;
  values: Record<string, any>;
  onSetValue: (key: string, value: any) => void;
}) => {
  const visibleFields = section.fields.filter((f) => f.visibleRoles.includes(role as any));
  return (
    <div className="card-premium p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-foreground">{section.title}</h3>
        {canEdit && <span className="text-[10px] text-muted-foreground">סקציה מותאמת</span>}
      </div>
      {visibleFields.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">אין שדות בסקציה זו עדיין.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleFields.map((f) => {
            const editable = f.editRoles.includes(role as any) && (role !== "admin" || canEdit ? f.editRoles.includes(role as any) && (role === "admin" ? canEdit : true) : false);
            // Simplify: admins must be in edit mode; others may edit if their role is in editRoles.
            const allowEdit = role === "admin" ? canEdit && f.editRoles.includes("admin") : f.editRoles.includes(role as any);
            return (
              <div key={f.id} className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">
                  {f.label}{f.required && <span className="text-destructive mr-1">*</span>}
                </label>
                <CustomFieldRenderer field={f} value={values[f.key]} editable={allowEdit} onSave={(v) => onSetValue(f.key, v)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
