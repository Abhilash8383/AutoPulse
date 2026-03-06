---
name: moto-ui-consistency
description: Use the moto frontend design system—design tokens, UI components, and layout patterns from frontend/src—when creating or editing React/UI so all screens stay consistent. Apply when working in frontend/, especially app/dashboard/, components/, or globals.css.
compatibility:
  - Cursor
  - Claude Code
license: MIT
---

# Moto UI Consistency

When creating or editing UI in the moto frontend, follow this design system so every screen looks and behaves the same.

## When to use this skill

- Adding or changing UI in `frontend/`
- New dashboard pages, dialogs, tables, or forms
- Styling changes in `frontend/src/app/globals.css`
- New components that should match the rest of the app

## Design tokens

Use only the semantic CSS variables defined in `frontend/src/app/globals.css`. Do not use arbitrary hex or rgb values except the brand accent.

**Colors (use Tailwind semantic classes):** `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`, `chart-1` through `chart-5`, `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`.

**Radius:** Use `--radius`-derived values; Tailwind exposes `radius-sm`, `radius-md`, `radius-lg`, `radius-xl`.

**Brand accent:** The only allowed raw hex is `#1976B8` for nav icons, active indicator bar, and profile border. Use `style={{ color: "#1976B8" }}` or `style={{ backgroundColor: "#1976B8" }}` only for those elements.

**Dark mode:** All tokens have `.dark` overrides. Do not hardcode light-only colors; use semantic tokens so themes switch correctly.

## Components

Import only from `@/components/ui/`. Use these existing components instead of building one-off styled divs:

- **Button** – `@/components/ui/button` (variants: default, destructive, outline, secondary, ghost, link; sizes: default, sm, lg, icon, icon-sm, icon-lg)
- **Card** – `@/components/ui/card` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction)
- **Dialog** – `@/components/ui/dialog` (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter)
- **Form** – `@/components/ui/form` with react-hook-form
- **Input** – `@/components/ui/input`
- **Label** – `@/components/ui/label`
- **Select** – `@/components/ui/select` (Select, SelectTrigger, SelectValue, SelectContent, SelectItem)
- **Table** – `@/components/ui/table` (Table, TableHeader, TableBody, TableRow, TableHead, TableCell)
- **Tabs** – `@/components/ui/tabs`
- **Badge** – `@/components/ui/badge`
- **Textarea** – `@/components/ui/textarea`
- **Skeleton** – `@/components/ui/skeleton` for loading states
- **Switch** – `@/components/ui/switch`
- **Separator** – `@/components/ui/separator`
- **Collapsible** – `@/components/ui/collapsible`
- **DropdownMenu** – `@/components/ui/dropdown-menu`
- **Tooltip** – `@/components/ui/tooltip`

Use **Breadcrumb** from `@/components/breadcrumb` and **ThemeSwitcherButtons** from `@/components/theme-switcher-buttons` where the layout expects them. Do not add new global UI primitives; extend or compose from the list above.

## Layout

- **Dashboard:** All dashboard pages render inside the existing `app/dashboard/layout.tsx` (sidebar + breadcrumb bar). Do not replace or duplicate the layout.
- **Main content:** Content area uses `max-w-[1600px] mx-auto w-full` and padding as in the layout (`px-4 sm:px-6 md:px-8 lg:px-10 xl:px-16 2xl:px-20 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10`).
- **Utility classes from globals.css:** Prefer `responsive-container`, `responsive-container-narrow`, `dashboard-grid`, `stats-grid`, `content-grid` for layout. Use `card-elevated` for elevated cards; `badge-success`, `badge-warning`, `badge-error` for status badges. Use `nav-item` for nav items; `hover-lift`, `hover-glow`, `hover-scale` only where appropriate.

## Typography

- **Fonts:** Geist Sans and Geist Mono (set in root layout). Do not introduce new font families.
- **App-wide text size (locked):** The whole app uses a size **between small and medium**. Do not change this.
  - **Root:** In `globals.css`, `html` must keep `font-size: clamp(13px, 0.8125rem + 0.35vw, 15px);` (between small and middle).
  - **UI components:** Buttons, inputs, tables, labels, tabs, cards, breadcrumb, and sidebar nav use `text-sm` (or `text-sm sm:text-base` for inputs/selects). New UI and new pages must use this same scale: prefer `text-sm` for body and controls, `text-base` only for emphasis or when matching existing patterns. Do not use `text-xs` for primary content; do not bump everything to `text-base` so the app stays in this “between small and middle” size.
- **Sizes:** Prefer fluid classes from globals.css where applicable: `text-fluid-xs`, `text-fluid-sm`, `text-fluid-base`, `text-fluid-lg`, `text-fluid-xl`, `text-fluid-2xl`, `text-fluid-3xl`, `text-fluid-4xl`. For body/controls, use `text-sm` (or existing component defaults). Avoid one-off classes like `text-[14px]`; use semantic tokens and the locked scale above.

## Page structure

- **Dashboard page:** Typically a header row (title + actions), then Card(s), optional data table, and shared `Pagination` component. Use a `Create*Dialog` or similar pattern for create flows.
- **Loading:** Each route that fetches data should have a `loading.tsx` that shows a centered spinner and "Loading..." text, consistent with existing `dashboard/loading.tsx` and section-specific loading files.
- **Forms in dialogs:** Use Dialog from ui with DialogHeader (DialogTitle, DialogDescription), DialogContent, and form built from Label + Input/Select/Textarea; primary submit with Button (variant default or destructive as appropriate).

## Don’t

- Add new one-off styled components when a ui component already exists (e.g. don’t build a custom “card” div if Card exists).
- Use arbitrary colors (e.g. `bg-[#fff]`) or font sizes (e.g. `text-[13px]`) except where matching an existing token or the single brand hex.
- Bypass the dashboard layout or duplicate sidebar/breadcrumb logic.
- Omit loading states for async routes; use the same loading pattern as other dashboard sections.
- Break responsive or touch rules defined in globals.css (e.g. touch targets min 44px, scrollbar styling, focus rings).

## Additional reference

For a quick token list, component paths, and example snippets (Card, Dialog, table + Pagination), see [reference.md](reference.md).
