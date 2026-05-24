/**
 * EditableElement — lightweight render-prop wrapper.
 *
 * Passes the default label and subtitle through to children so all call-sites
 * continue to compile unchanged. The old "click-to-select / BuilderOverlay"
 * behaviour has been removed; the Admin Builder at /admin/builder is the
 * canonical place to manage layout and custom fields.
 */
import type { ReactNode, CSSProperties } from "react";

export interface ResolvedElement {
  label: string;
  subtitle?: string;
  visible: boolean;
  stylePreset: "default";
  stylePresetClass: string;
  inlineStyle: CSSProperties;
}

/** Kept as a named export for import-compatibility; always returns {}. */
export function buildInlineStyle(): CSSProperties {
  return {};
}

interface Props {
  id: string;
  type: string;
  defaultLabel: string;
  defaultSubtitle?: string;
  pageKey?: string;
  children: (resolved: ResolvedElement) => ReactNode;
  hideWhenInvisible?: boolean;
}

const EditableElement = ({ defaultLabel, defaultSubtitle, children }: Props) => (
  <>
    {children({
      label: defaultLabel,
      subtitle: defaultSubtitle,
      visible: true,
      stylePreset: "default",
      stylePresetClass: "",
      inlineStyle: {},
    })}
  </>
);

export default EditableElement;
