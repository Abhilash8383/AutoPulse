/**
 * Resolve display fields from Contact when present (Phase 6: single source of truth).
 * Use for Visitor, DigitalEnquiry, FieldInquiry when returning to API.
 */
type WithContact = {
  firstName?: string | null;
  lastName?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  contact?: {
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    email?: string | null;
    address?: string | null;
  } | null;
};

export function resolveDisplay<T extends WithContact>(row: T): T & { firstName: string; lastName: string; whatsappNumber: string; email: string | null; address: string | null } {
  const c = row.contact;
  return {
    ...row,
    firstName: c?.firstName ?? row.firstName ?? "",
    lastName: c?.lastName ?? row.lastName ?? "",
    whatsappNumber: c?.whatsappNumber ?? row.whatsappNumber ?? "",
    email: c?.email ?? row.email ?? null,
    address: c?.address ?? row.address ?? null,
  };
}

export function getVisitorPhone(
  v: { contact?: { whatsappNumber?: string } | null; whatsappNumber?: string | null }
): string {
  return v.contact?.whatsappNumber ?? v.whatsappNumber ?? "";
}
