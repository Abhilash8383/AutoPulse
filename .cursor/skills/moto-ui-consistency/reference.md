# Moto UI — Quick reference

## Design tokens (Tailwind classes)

Use these semantic names as Tailwind classes (e.g. `bg-background`, `text-foreground`, `border-border`):

| Purpose | Token names |
|--------|-------------|
| Surfaces | `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground` |
| Actions / emphasis | `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `accent`, `accent-foreground`, `destructive` |
| Muted / borders | `muted`, `muted-foreground`, `border`, `input`, `ring` |
| Charts | `chart-1`, `chart-2`, `chart-3`, `chart-4`, `chart-5` |
| Sidebar | `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` |
| Radius | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` (map to `--radius`) |

**Brand accent (exception):** `#1976B8` — use only for nav icons, active indicator, profile border via inline style.

**Text size (locked):** App uses a size between small and medium. Root: `font-size: clamp(13px, 0.8125rem + 0.35vw, 15px)` in `globals.css`. Use `text-sm` for body, labels, buttons, tables, breadcrumb, sidebar; `text-sm sm:text-base` for inputs/selects where present. Do not change to smaller (text-xs) or full medium (text-base everywhere).

## Component paths

```
@/components/ui/button
@/components/ui/card
@/components/ui/dialog
@/components/ui/form
@/components/ui/input
@/components/ui/label
@/components/ui/select
@/components/ui/table
@/components/ui/tabs
@/components/ui/badge
@/components/ui/textarea
@/components/ui/skeleton
@/components/ui/switch
@/components/ui/separator
@/components/ui/collapsible
@/components/ui/dropdown-menu
@/components/ui/tooltip
@/components/breadcrumb
@/components/theme-switcher-buttons
```

## Card example

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

## Dialog + form example

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create item</DialogTitle>
      <DialogDescription>Optional description.</DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

## Table + Pagination pattern

- Use `@/components/ui/table` for the table.
- Use the section-specific `Pagination` component (e.g. `dashboard/digital-enquiry/components/Pagination.tsx`) or the same props pattern: `currentPage`, `totalPages`, `onPageChange`, `pageLoading`.

## Loading pattern

- Add `loading.tsx` in the route folder.
- Either: centered spinner + "Loading..." text, or skeleton layout using `Skeleton` and `Card` from ui (see `frontend/src/app/dashboard/loading.tsx`).

## Layout utility classes (globals.css)

- `responsive-container`, `responsive-container-narrow`
- `dashboard-grid`, `stats-grid`, `content-grid`
- `card-elevated`, `badge-success`, `badge-warning`, `badge-error`
- `nav-item`, `text-fluid-*` (xs through 4xl)
