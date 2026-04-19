# CRM AI Context (AutoPulse)

This document is a quick technical map of the CRM area for future AI-assisted work.

## Scope

CRM in this codebase mainly includes:
- Contacts
- Leads pipeline
- Lead timeline events
- Lead notes
- Contact activity aggregation across modules

Primary source folders:
- `backend/src/routes`, `backend/src/controllers`, `backend/src/repositories`
- `frontend/src/app/dashboard/crm`
- `frontend/src/services/api`

## Backend CRM Map

### Route registration
- All CRM routes are mounted in `backend/src/routes/index.ts`:
  - `/api/contacts`
  - `/api/crm/leads`
  - `/api/crm/notes`
  - `/api/crm/timeline`

### Contacts
- Route file: `backend/src/routes/contacts.ts`
- Controller: `backend/src/controllers/contact.controller.ts`
- Repository: `backend/src/repositories/contact.repository.ts`

Key endpoints:
- `GET /api/contacts`
- `POST /api/contacts`
- `GET /api/contacts/activity` (unified feed for table)
- `GET /api/contacts/:id`
- `GET /api/contacts/:id/activity`
- `PATCH /api/contacts/:id`

Important behavior:
- Tenant scope supports both dealership-level and org-level admin access.
- Contact create is idempotent by dealership + normalized phone via `findOrCreate`.
- Creating a contact auto-upserts an `import` CRM lead.
- `activityFeed` merges rows from Visitor, DigitalEnquiry, FieldInquiry, DeliveryTicket.

### Leads
- Route file: `backend/src/routes/crm-leads.ts`
- Controller: `backend/src/controllers/crm-leads.controller.ts`
- Repository: `backend/src/repositories/crm-lead.repository.ts`

Key endpoints:
- `GET /api/crm/leads`
- `GET /api/crm/leads/:id`
- `PATCH /api/crm/leads/:id`
- `POST /api/crm/leads/from-contact`

Important behavior:
- Supports filters: `search`, `stage`, `status`, `ownerUserId`, `overdue`, `sourceType`.
- Tenant-aware list and read (dealership vs organization scope).
- Update writes timeline event `lead_updated` with field diffs.
- Upsert from source uses unique key `(dealershipId, sourceType, sourceId)`.
- Default follow-up: `import` leads get +1 day, intake leads default to null.

### Timeline
- Route file: `backend/src/routes/crm-timeline.ts`
- Controller: `backend/src/controllers/crm-timeline.controller.ts`

Endpoint:
- `GET /api/crm/timeline?contactId=&leadId=`

Important behavior:
- Requires `contactId`.
- Tenant-scoped by dealership IDs.

### Notes
- Route file: `backend/src/routes/crm-notes.ts`
- Controller: `backend/src/controllers/crm-notes.controller.ts`

Endpoints:
- `GET /api/crm/notes?contactId=&leadId=`
- `POST /api/crm/notes`

Important behavior:
- Creating a note also writes timeline event `note_added`.

### Related intake update endpoints (used by CRM lead detail page)
- Digital enquiry details: `PATCH /api/digital-enquiry/:id/details`
- Field inquiry details: `PATCH /api/field-inquiry/:id/details`
- Delivery ticket details: `PATCH /api/delivery-tickets/:id/details`

These are not in `/api/crm/*` but are used by CRM UI to edit source-specific details.

## Frontend CRM Map

### Pages
- Contacts list: `frontend/src/app/dashboard/crm/contacts/page.tsx`
- Add contact: `frontend/src/app/dashboard/crm/contacts/add/page.tsx`
- Leads list: `frontend/src/app/dashboard/crm/leads/page.tsx`
- Lead detail: `frontend/src/app/dashboard/crm/leads/[id]/page.tsx`

### API service files
- Contacts API: `frontend/src/services/api/contact.service.ts`
- Leads API: `frontend/src/services/api/crm-leads.service.ts`
- Notes API: `frontend/src/services/api/crm-notes.service.ts`
- Timeline API: `frontend/src/services/api/crm-timeline.service.ts`
- User assignment dropdown: `frontend/src/services/api/users.service.ts`

### UI behavior summary
- Contacts page currently displays unified contact activity rows (not only raw contacts).
- Contacts actions: view, edit, convert to lead.
- Lead list supports quick inline updates for stage, owner, follow-up datetime.
- Lead detail has tabs: details, timeline, notes.
- Lead detail can edit source module data depending on lead `sourceType`:
  - `digital_enquiry` and `field_inquiry`: lead scope/source/model/variant/reason
  - `import`: latest delivery ticket details if available

## Permission and Access Model (CRM relevant)

- Most CRM endpoints use:
  - `authenticate`
  - `checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS)`
- Tenant isolation is enforced through scoped dealership IDs and org admin checks.

Implication:
- CRM is currently permission-gated under the Daily Walkins Visitors permission key.

## Data Model Notes (Prisma)

CRM core models in `backend/prisma/schema.prisma`:
- `Contact`
- `CrmLead`
- `CrmTimelineEvent`
- `CrmNote`

Lead source relation is logical (by `sourceType` + `sourceId`), not foreign-key constrained to all source tables.

The app is in a transition where contact is the canonical person record, while some legacy fields remain on intake tables for compatibility.

## Practical Checklist for Future CRM Changes

When changing CRM behavior, usually update all of these together:
1. Backend route/controller/repository.
2. Frontend API service types and function.
3. CRM page state and UI action.
4. Timeline event logging if the change should be auditable.
5. Tenant scope + permission checks.

When adding a new lead source type:
1. Extend Prisma enum `CrmLeadSourceType`.
2. Update backend filters and parsing.
3. Update frontend source labels and types.
4. Add source-specific details editor logic (if needed).
