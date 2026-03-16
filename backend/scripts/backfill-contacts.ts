/**
 * =============================================================
 * CONTACT BACKFILL SCRIPT (Idempotent)
 * =============================================================
 * Links existing Visitor, DigitalEnquiry, and FieldInquiry rows
 * to canonical Contact records by dealership + normalized phone.
 * Safe to run multiple times (skips already-linked rows).
 *
 * Usage: pnpm run backfill:contacts
 *    or: npx tsx scripts/backfill-contacts.ts
 * =============================================================
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    return cleaned.startsWith("91") && cleaned.length === 12
      ? cleaned.substring(2)
      : cleaned.slice(-10);
  }
  return cleaned;
}

type ContactRow = { id: string; firstName: string; lastName: string; whatsappNumber: string; email: string | null; address: string | null };

/**
 * Find or create a contact using a pre-loaded map (avoids N+1: one findMany per dealership).
 * Mutates the map when a new contact is created so subsequent rows can find it.
 */
async function findOrCreateContactWithMap(
  map: Map<string, ContactRow>,
  dealershipId: string,
  payload: {
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    email?: string | null;
    address?: string | null;
  },
): Promise<string> {
  const normalized = normalizePhone(payload.whatsappNumber);
  const match = map.get(normalized);
  if (match) {
    await prisma.contact.update({
      where: { id: match.id },
      data: {
        firstName: payload.firstName ?? match.firstName,
        lastName: payload.lastName ?? match.lastName,
        email: payload.email ?? match.email,
        address: payload.address ?? match.address,
      },
    });
    return match.id;
  }
  const created = await prisma.contact.create({
    data: {
      dealershipId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      whatsappNumber: payload.whatsappNumber,
      normalizedWhatsappNumber: normalized,
      email: payload.email ?? null,
      address: payload.address ?? null,
    },
  });
  map.set(normalized, {
    id: created.id,
    firstName: created.firstName,
    lastName: created.lastName,
    whatsappNumber: created.whatsappNumber,
    email: created.email,
    address: created.address,
  });
  return created.id;
}

async function main() {
  console.log("Contact backfill (idempotent) — starting.\n");

  const dealershipIds = await prisma.dealership.findMany({
    where: { id: { not: undefined } },
    select: { id: true },
  });
  const ids = dealershipIds.map((d) => d.id);
  if (ids.length === 0) {
    console.log("No dealerships found. Exiting.");
    return;
  }

  let visitorsLinked = 0;
  let visitorsSkipped = 0;
  let enquiriesLinked = 0;
  let enquiriesSkipped = 0;
  let fieldLinked = 0;
  let fieldSkipped = 0;

  for (const dealershipId of ids) {
    const contacts = await prisma.contact.findMany({
      where: { dealershipId },
      select: { id: true, firstName: true, lastName: true, whatsappNumber: true, email: true, address: true },
    });
    const contactByNormalized = new Map<string, ContactRow>();
    for (const c of contacts) {
      contactByNormalized.set(normalizePhone(c.whatsappNumber), c);
    }

    const visitors = await prisma.visitor.findMany({
      where: { dealershipId, contactId: null },
    });
    for (const v of visitors) {
      const phone = (v.whatsappNumber ?? "").trim();
      if (!phone) {
        console.warn(`Skipping visitor ${v.id} due to missing required field (whatsappNumber).`);
        visitorsSkipped++;
        continue;
      }
      const contactId = await findOrCreateContactWithMap(contactByNormalized, dealershipId, {
        firstName: v.firstName ?? "",
        lastName: v.lastName ?? "",
        whatsappNumber: phone,
        email: v.email,
        address: v.address,
      });
      await prisma.visitor.update({
        where: { id: v.id },
        data: { contactId },
      });
      visitorsLinked++;
    }

    const digitalEnquiries = await prisma.digitalEnquiry.findMany({
      where: { dealershipId, contactId: null },
    });
    for (const e of digitalEnquiries) {
      const phone = (e.whatsappNumber ?? "").trim();
      if (!phone) {
        console.warn(`Skipping digital enquiry ${e.id} due to missing required field (whatsappNumber).`);
        enquiriesSkipped++;
        continue;
      }
      const contactId = await findOrCreateContactWithMap(contactByNormalized, dealershipId, {
        firstName: e.firstName ?? "",
        lastName: e.lastName ?? "",
        whatsappNumber: phone,
        email: e.email,
        address: e.address,
      });
      await prisma.digitalEnquiry.update({
        where: { id: e.id },
        data: { contactId },
      });
      enquiriesLinked++;
    }

    const fieldInquiries = await prisma.fieldInquiry.findMany({
      where: { dealershipId, contactId: null },
    });
    for (const f of fieldInquiries) {
      const phone = (f.whatsappNumber ?? "").trim();
      if (!phone) {
        console.warn(`Skipping field inquiry ${f.id} due to missing required field (whatsappNumber).`);
        fieldSkipped++;
        continue;
      }
      const contactId = await findOrCreateContactWithMap(contactByNormalized, dealershipId, {
        firstName: f.firstName ?? "",
        lastName: f.lastName ?? "",
        whatsappNumber: phone,
        email: f.email,
        address: f.address,
      });
      await prisma.fieldInquiry.update({
        where: { id: f.id },
        data: { contactId },
      });
      fieldLinked++;
    }
  }

  console.log(
    `Done. Linked: Visitors ${visitorsLinked}, DigitalEnquiry ${enquiriesLinked}, FieldInquiry ${fieldLinked}.`,
  );
  if (visitorsSkipped || enquiriesSkipped || fieldSkipped) {
    console.log(
      `Skipped (missing phone): Visitors ${visitorsSkipped}, DigitalEnquiry ${enquiriesSkipped}, FieldInquiry ${fieldSkipped}.`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
