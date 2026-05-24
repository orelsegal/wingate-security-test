/**
 * EditableElement — wraps any UI node and makes it selectable + overridable
 * by the Visual Admin Builder. Renders via a render-prop so each call site
 * stays in control of its own markup.
 */
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBuilderUI, type ElementType, ELEMENT_TYPE_LABEL } from "@/context/BuilderUIContext";
import { useBuilderOverrides, STYLE_PRESET_CLASS, type StylePreset } from "@/context/BuilderOverridesContext";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import type { CSSProperties } from "react";

export interface ResolvedElement {
  label: string;
  subtitle?: string;
  visible: boolean;
  stylePreset: StylePreset;
  stylePresetClass: string;
  /** Inline styles derived from builder overrides — spread onto your root element */
  inlineStyle: CSSProperties;
}

/** Build a CSSProperties object from an ElementOverride */
export function buildInlineStyle(override: ReturnType<typeof useBuilderOverrides>["overrides"][string] | undefined): CSSProperties {
  if (!override) return {};
  const s: CSSProperties = {};
  if (override.textColor) s.color = override.textColor;
  if (override.bgColor) s.backgroundColor = override.bgColor;
  if (override.borderColor) s.borderColor = override.borderColor;
  if (override.fontFamily && override.fontFamily !== "inherit") s.fontFamily = override.fontFamily;
  if (override.fontSize) s.fontSize = `${override.fontSize}px`;
  if (override.fontWeight) s.fontWeight = override.fontWeight;
  if (override.lineHeight) s.lineHeight = override.lineHeight;
  if (override.letterSpacing) s.letterSpacing = `${override.letterSpacing}em`;
  if (override.textAlign) s.textAlign = override.textAlign;
  if (override.paddingTop != null) s.paddingTop = `${override.paddingTop}px`;
  if (override.paddingBottom != null) s.paddingBottom = `${override.paddingBottom}px`;
  if (override.paddingX != null) { s.paddingLeft = `${override.paddingX}px`; s.paddingRight = `${override.paddingX}px`; }
  if (override.borderRadius != null) s.borderRadius = `${override.borderRadius}px`;
  if (override.gap != null) s.gap = `${override.gap}px`;
  return s;
}

interface Props {
  id: string;
  type: ElementType;
  defaultLabel: string;
  defaultSubtitle?: string;
  pageKey?: string;
  /** Children render-prop receives resolved label/visibility/style */
  children: (resolved: ResolvedElement) => ReactNode;
  /** When true, render nothing (instead of placeholder) when visible=false */
  hideWhenInvisible?: boolean;
}

const EditableElement = ({ id, type, defaultLabel, defaultSubtitle, pageKey = "global", children, hideWhenInvisible = true }: Props) => {
  const { user } = useAuth();
  const { editMode, selectedId, select, register, unregister, previewRole } = useBuilderUI();
  const { getOverride } = useBuilderOverrides();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    register({ id, type, pageKey, defaultLabel });
    return () => unregister(id);
  }, [id, type, pageKey, defaultLabel, register, unregister]);

  const override = getOverride(id);
  const label = override?.label ?? defaultLabel;
  const subtitle = override?.subtitle ?? defaultSubtitle;
  const stylePreset = override?.stylePreset ?? "default";
  const stylePresetClass = STYLE_PRESET_CLASS[stylePreset];

  // Role-visibility: when previewing as role, treat that role as the viewer.
  // Admin in real edit mode always sees the element so they can edit it.
  const viewerRole = previewRole ?? user?.role ?? null;
  const roleVisibility = override?.roleVisibility;
  const rolePermits = !roleVisibility || (viewerRole ? roleVisibility.includes(viewerRole) : true);
  const visibilityFlag = override?.visible !== false;
  let visible = visibilityFlag && rolePermits;

  // While admin is actively editing (no preview role), never hide so they can re-toggle
  if (isAdmin && editMode && !previewRole) visible = true;

  const inlineStyle = buildInlineStyle(override);
  const resolved: ResolvedElement = { label, subtitle, visible, stylePreset, stylePresetClass, inlineStyle };

  if (!visible && hideWhenInvisible) return null;

  const inner = children(resolved);

  if (!isAdmin || !editMode) return <>{inner}</>;

  const selected = selectedId === id;
  return (
    <div
      data-builder-id={id}
      // Capture phase: intercept ALL clicks before they reach child buttons/links
      // This prevents navigation/actions when admin is in edit mode (Elementor behaviour)
      onClickCapture={(e) => {
        e.stopPropagation();
        e.preventDefault();
        select(id);
      }}
      className={cn(
        "relative group cursor-pointer transition-shadow",
        "outline outline-1 outline-dashed outline-transparent hover:outline-primary/40 rounded-md",
        selected && "outline-primary outline-2",
        override?.visible === false && "opacity-50",
      )}
    >
      {/* Type label badge */}
      <span className={cn(
        "absolute -top-2 -start-2 z-20 text-[9px] font-medium px-1.5 py-0.5 rounded bg-primary text-primary-foreground shadow",
        "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
        selected && "opacity-100",
      )}>
        {ELEMENT_TYPE_LABEL[type]}
      </span>
      {/* Edit pencil icon */}
      <span className={cn(
        "absolute -top-2 -end-2 z-20 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow",
        "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
        selected && "opacity-100",
      )}>
        <Pencil className="h-3 w-3" strokeWidth={2} />
      </span>
      {/* Transparent click-blocker overlay — prevents inner links/buttons from firing */}
      <div className="absolute inset-0 z-10" aria-hidden />
      {inner}
    </div>
  );
};

export default EditableElement;
