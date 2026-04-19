# Roles, Hierarchy, and Access (AutoPulse)

This document explains the RBAC hierarchy, role behavior, and what each role can do.

## Role Hierarchy

The app uses a 3-tier role model:

1. `super_admin` (highest)
2. `admin`
3. `user`

Defined in:
- `backend/prisma/schema.prisma` (`UserRole` enum)
- `backend/src/lib/auth.ts`
- `frontend/src/lib/auth.ts`

## How Access Is Decided

Permission checks use this cascade:

1. Organization feature toggle (`OrgFeatureToggle`) as master switch.
2. Role default:
   - `super_admin` and `admin` bypass normal permission checks.
   - `user` depends on explicit permission flags.
3. Per-user permissions (`UserPermission`) for regular users.

Implemented in:
- `backend/src/middleware/permissions.ts`

Important rule:
- If an org feature toggle is OFF, regular users are blocked even if their user permission is ON.
- Admin/super_admin routes generally bypass `checkPermission(...)`, but routes protected by `requireSuperAdmin` still require super admin specifically.

## Permission Names

Permission keys (feature-level access):

- `dashboard`
- `dailyWalkinsVisitors`
- `dailyWalkinsSessions`
- `digitalEnquiry`
- `fieldInquiry`
- `deliveryUpdate`
- `exportExcel`
- `settingsProfile`
- `settingsVehicleModels`
- `settingsLeadSources`
- `settingsWhatsApp`

Defined in:
- `backend/src/config/permissions.ts`

## What Each Role Can Do

### 1) Super Admin

Super admin is the organization owner-level role.

Core capabilities:
- Full access to all standard features across permission gates.
- Access to organization management routes protected by `requireSuperAdmin`.
- Manage organization-level feature toggles.
- View organization users and org statistics.
- Access super-admin dashboard sections like org settings and usage stats.

Examples of super-admin-only endpoints:
- `GET /api/organizations/users`
- `GET /api/organizations/feature-toggles`
- `PATCH /api/organizations/feature-toggles`
- `GET /api/organizations/statistics`
- `GET /api/organizations/user-stats`

### 2) Admin

Admin is a manager role.

Core capabilities:
- Full access to standard feature routes protected by `checkPermission(...)`.
- Can manage users in their own dealership (create/update/delete/list via auth user-management endpoints).
- Can assign user permissions when creating/updating users.

Important limits:
- Admin cannot access routes that require `requireSuperAdmin`.
- Admin user-management actions are restricted to users in the same dealership.

Examples of admin routes:
- `GET /api/auth/users`
- `POST /api/auth/users`
- `PUT /api/auth/users/:id`
- `DELETE /api/auth/users/:id`

### 3) User

User is a staff role.

Core capabilities:
- Access only the features explicitly enabled in `UserPermission`.
- Also constrained by organization feature toggles.
- Cannot access admin/super-admin management endpoints.

Default behavior:
- New regular users are typically created with permissions OFF by default unless set explicitly.

## "Other People" in the System

In practical terms, "other people" means:

- **Users (staff):** do day-to-day work (walkins, enquiries, delivery, etc.) based on granted permissions.
- **Admins (managers):** run the team, manage users and permissions within dealership scope.
- **Super Admins (owners/org heads):** control organization-wide settings and feature toggles.

## Multi-Tenant Scope Rules

The system is multi-tenant with organization and dealership context in JWT and DB.

High-level rules:
- Data is scoped to organization/dealership context.
- Many admin operations are dealership-scoped.
- Super-admin org routes use organization scope.

Related files:
- `backend/src/middleware/auth.ts`
- `backend/src/lib/auth.ts`
- `backend/prisma/schema.prisma`

## UI Behavior

Frontend permission context mirrors backend logic:
- Role checks: `isSuperAdmin`, `isAdmin`, `isUser`
- Permission checks: `hasPermission(...)`
- Org-level feature checks: `isFeatureEnabled(...)`

Implemented in:
- `frontend/src/contexts/permissions.tsx`

## Quick Summary

- `super_admin`: full access + organization control.
- `admin`: full operational access + dealership user management.
- `user`: only assigned features, and only if org toggle allows.
