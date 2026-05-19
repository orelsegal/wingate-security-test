import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";

/**
 * Admin Builder — Phase 1 foundation.
 *
 * Provides a global "Edit Mode" that only admins can toggle.
 * Components consume `useEditMode()` and pass `editable={canEdit}` to inline editors.
 *
 * Future phases will extend this context with:
 *  - custom fields registry
 *  - drag-and-drop layout state
 *  - form builder schemas
 *  - dashboard builder
 *  - per-role permission rules
 */

export type EditModeScope = "student-profile" | "global";

interface EditModeContextType {
  /** Is edit mode currently active */
  enabled: boolean;
  /** Can the current user toggle edit mode (admin only) */
  canToggle: boolean;
  /** Toggle edit mode on/off */
  toggle: () => void;
  setEnabled: (v: boolean) => void;
  /** Helper for components: should this field render edit controls? */
  canEdit: boolean;
}

const EditModeContext = createContext<EditModeContextType>({
  enabled: false,
  canToggle: false,
  toggle: () => {},
  setEnabled: () => {},
  canEdit: false,
});

export const useEditMode = () => useContext(EditModeContext);

export const EditModeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const canToggle = user?.role === "admin";
  const toggle = useCallback(() => {
    if (!canToggle) return;
    setEnabled((v) => !v);
  }, [canToggle]);

  const canEdit = canToggle && enabled;

  return (
    <EditModeContext.Provider value={{ enabled, canToggle, toggle, setEnabled, canEdit }}>
      {children}
    </EditModeContext.Provider>
  );
};
