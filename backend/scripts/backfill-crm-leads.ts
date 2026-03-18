/**
 * =============================================================
 * CRM LEADS BACKFILL SCRIPT (Idempotent)
 * =============================================================
 * Creates CrmLead rows for existing source rows (Visitor, DigitalEnquiry,
 * FieldInquiry) that are already linked to a Contact.
 *
 * Also seeds a minimal timeline: adds a `lead_created` event for any lead
 * that currently has no timeline events.
 *
 * Usage: pnpm run backfill:crm-leads
 *    or: npx tsx scripts/backfill-crm-leads.ts
 * =============================================================
 */

import prisma from "../src/lib/db";

async function main() {
  console.log("CRM leads backfill (idempotent) — starting.\n");

  const dealershipIds = await prisma.dealership.findMany({
    select: { id: true },
  });
  const ids = dealershipIds.map((d) => d.id);
  if (ids.length === 0) {
    console.log("No dealerships found. Exiting.");
    return;
  }

  let leadsCreated = 0;
  let eventsCreated = 0;

  for (const dealershipId of ids) {
    // 1) Create missing leads for each source table (skip duplicates).
    const [visitors, digitalEnquiries, fieldInquiries] = await Promise.all([
      prisma.visitor.findMany({
        where: { dealershipId, contactId: { not: null } },
        select: { id: true, contactId: true },
      }),
      prisma.digitalEnquiry.findMany({
        where: { dealershipId, contactId: { not: null } },
        select: { id: true, contactId: true },
      }),
      prisma.fieldInquiry.findMany({
        where: { dealershipId, contactId: { not: null } },
        select: { id: true, contactId: true },
      }),
    ]);

    const leadRows = [
      ...visitors.map((v) => ({
        dealershipId,
        contactId: v.contactId!,
        sourceType: "visitor" as const,
        sourceId: v.id,
        stage: "new" as const,
        status: "open" as const,
        nextFollowUpAt: null,
      })),
      ...digitalEnquiries.map((e) => ({
        dealershipId,
        contactId: e.contactId!,
        sourceType: "digital_enquiry" as const,
        sourceId: e.id,
        stage: "new" as const,
        status: "open" as const,
        nextFollowUpAt: null,
      })),
      ...fieldInquiries.map((f) => ({
        dealershipId,
        contactId: f.contactId!,
        sourceType: "field_inquiry" as const,
        sourceId: f.id,
        stage: "new" as const,
        status: "open" as const,
        nextFollowUpAt: null,
      })),
    ];

    if (leadRows.length > 0) {
      const result = await prisma.crmLead.createMany({
        data: leadRows,
        skipDuplicates: true,
      });
      leadsCreated += result.count;
    }

    // 2) Seed `lead_created` timeline event for any lead with no timeline yet.
    const leadsWithoutTimeline = await prisma.crmLead.findMany({
      where: {
        dealershipId,
        timelineEvents: { none: {} },
      },
      select: { id: true, contactId: true, sourceType: true, sourceId: true },
    });

    if (leadsWithoutTimeline.length > 0) {
      const result = await prisma.crmTimelineEvent.createMany({
        data: leadsWithoutTimeline.map((l) => ({
          dealershipId,
          contactId: l.contactId,
          leadId: l.id,
          type: "lead_created",
          payload: { sourceType: l.sourceType, sourceId: l.sourceId } as any,
        })),
      });
      eventsCreated += result.count;
    }
  }

  console.log(
    `Done. Leads created: ${leadsCreated}. Timeline events created: ${eventsCreated}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

