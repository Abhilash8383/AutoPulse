/**
 * =============================================================
 * DELIVERY TICKET → CONTACT BACKFILL (Idempotent)
 * =============================================================
 * Links existing DeliveryTicket rows to canonical Contact records by
 * dealership + normalized phone. Safe to run multiple times.
 *
 * Usage: pnpm run backfill:delivery-ticket-contacts
 *    or: npx tsx scripts/backfill-delivery-ticket-contacts.ts
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

type ContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email: string | null;
  address: string | null;
};

async function main() {
  console.log("DeliveryTicket → Contact backfill — starting.\n");

  const dealerships = await prisma.dealership.findMany({
    select: { id: true },
  });
  const ids = dealerships.map((d) => d.id);
  if (ids.length === 0) {
    console.log("No dealerships found. Exiting.");
    return;
  }

  let linked = 0;
  let created = 0;
  let skipped = 0;

  for (const dealershipId of ids) {
    const contacts = await prisma.contact.findMany({
      where: { dealershipId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        whatsappNumber: true,
        email: true,
        address: true,
      },
    });
    const map = new Map<string, ContactRow>();
    for (const c of contacts) {
      map.set(normalizePhone(c.whatsappNumber), c);
    }

    const tickets = await prisma.deliveryTicket.findMany({
      where: { dealershipId, contactId: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        whatsappNumber: true,
        email: true,
        address: true,
      },
    });

    for (const t of tickets) {
      const phone = (t.whatsappNumber ?? "").trim();
      if (!phone) {
        skipped++;
        continue;
      }
      const key = normalizePhone(phone);
      const match = map.get(key);
      let contactId: string;
      if (match) {
        contactId = match.id;
      } else {
        const c = await prisma.contact.create({
          data: {
            dealershipId,
            firstName: t.firstName,
            lastName: t.lastName,
            whatsappNumber: phone,
            normalizedWhatsappNumber: key,
            email: t.email ?? null,
            address: t.address ?? null,
          },
        });
        map.set(key, {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          whatsappNumber: c.whatsappNumber,
          email: c.email,
          address: c.address,
        });
        contactId = c.id;
        created++;
      }

      await prisma.deliveryTicket.update({
        where: { id: t.id },
        data: { contactId },
      });
      linked++;
    }
  }

  console.log(
    `Done. Linked: ${linked}. Contacts created: ${created}. Skipped (missing phone): ${skipped}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());

