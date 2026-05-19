# בונה ממשק — Visual Admin Builder (Phase 1 Foundation)

## Why the current label table is not enough
The existing `/admin/labels` page is a flat form: an accordion with text inputs per label. It edits strings only, away from where they appear. It cannot touch visibility, style, layout, role-permissions or non-text elements (cards, buttons, sidebar items, badges). It feels like a settings screen, not a builder.

## Builder architecture to add

### Concepts
- **EditableElement** — wrapper component any page uses to mark a UI node as editable. Registers itself into the builder registry with: `id`, `type` (title/section/card/button/nav-item/badge/field), `pageKey`, `defaultLabel`, optional `defaultIcon`. Renders children with hover outline + type chip + edit handle when builder Edit Mode is on.
- **BuilderRegistry** (in-memory) — list of every mounted editable element on the current page, used to build the left structure tree.
- **BuilderOverridesContext** — extends current `UiLabelsContext` pattern. Stores per-element overrides: `{ label?, visible?, style?, layout?, roleVisibility?, roleEdit? }`. localStorage-persisted (`wingate_builder_overrides_v1`). Keyed by stable `elementId`.
- **BuilderUIContext** — ephemeral UI state: `editMode`, `selectedElementId`, `previewRole`, `mode: 'edit' | 'preview'`.
- **useEditableElement(id, defaults)** hook — returns resolved props (label, visible, style classes) after applying overrides + role filter.

### New components
- `src/components/builder/EditableElement.tsx` — wrapper with outline/handle/click-to-select.
- `src/components/builder/BuilderToolbar.tsx` — top bar: עריכה / תצוגה מקדימה / צפייה כ-role / שמור / איפוס.
- `src/components/builder/StructurePanel.tsx` — left tree from registry.
- `src/components/builder/ElementSettingsPanel.tsx` — right panel with 5 tabs: תוכן / סטייל / פריסה / הרשאות / מתקדם.
- `src/components/builder/BuilderWorkspace.tsx` — the new בונה ממשק page shell (toolbar + structure + canvas iframe-of-routes + settings).
- `src/context/BuilderUIContext.tsx`, `src/context/BuilderOverridesContext.tsx`.
- `src/config/builderRegistry.ts` — types + helpers.

### Files to edit (Phase 1 wiring only)
- `src/App.tsx` — wrap with new providers; replace `/admin/labels` element with `BuilderWorkspace` (route path kept for back-compat) and add `/admin/builder` alias.
- `src/components/AppSidebar.tsx` — rename nav entry to "בונה ממשק"; wrap each nav button in `EditableElement` (type=nav-item).
- `src/components/DashboardContent.tsx` — wrap admin dashboard page title + each stat/insight card in `EditableElement`.
- `src/pages/AdminLabelsPage.tsx` — replaced by re-export of `BuilderWorkspace` (kept as file so route import still resolves).

## What will be functional now (Phase 1)
- Admin-only "מצב עריכה" toggle in the Builder workspace top toolbar.
- Click any wrapped element (sidebar items, admin dashboard title + cards) to select it.
- Right settings panel with working: **תוכן** (label/subtitle text), **פריסה** (show/hide, order placeholder), **הרשאות** (per-role visibility checkboxes), **מתקדם** (element key, reset). **סטייל** tab present with 3 working presets (clean/bordered/elevated) applied via class tokens.
- Left structure panel listing all registered elements on the previewed page.
- Preview-as-role selector that re-renders the canvas with that role's visibility rules applied.
- localStorage persistence + per-element reset + global reset.
- Non-admin users see zero builder UI; overrides apply silently to their normal view.

## What is placeholder for later
- Drag-and-drop reordering (order field stored, no DnD UI yet).
- Icon picker (shows current icon name as text input).
- Canvas = embedded route render of current admin pages; only Sidebar + Admin Dashboard are wrapped in Phase 1. Students, Profile, Reports, Roadmaps, Data Entry, Activity Logs get wrapped in Phase 2.
- Custom (admin-created) elements — Phase 3.
- Supabase persistence — Phase 4 (table `builder_overrides` with admin RLS; current localStorage shape maps 1:1 to a JSON column).
- Advanced style controls (shadow/radius/bg color pickers) — Phase 2.

## What stays untouched
Routes, auth, RLS, DB schema, real data, business logic, existing pages' content, Student Profile builder (`BuilderContext`), `UiLabelsContext` (kept for back-compat; new system reads from it as fallback for nav labels).

## Risks
- Wrapping many nodes in `EditableElement` adds render overhead — mitigated by no-op render when `editMode=false` and user is not admin.
- localStorage drift across browsers until Phase 4.
- Hiding a sidebar item via role-visibility could lock admin out — guarded by always forcing admin role to bypass hide rules in edit mode.
- Two overlapping override systems (`UiLabelsContext` + new `BuilderOverridesContext`) during transition — resolved by reading old labels as defaults when no new override exists.
