/**
 * =============================================================
 * CLEANUP LEAD FOLLOW-UP DATES
 * =============================================================
 * Clears auto-generated nextFollowUpAt values for intake leads, so the Leads
 * work queue doesn't show a follow-up date unless staff explicitly sets it.
 *
 * We keep import leads (converted contacts) as-is.
 *
 * Usage: pnpm run cleanup:lead-followups
 * =============================================================
 */

import prisma from "../src/lib/db";

async function main() {
  const result = await prisma.crmLead.updateMany({
    where: {
      sourceType: { in: ["visitor", "digital_enquiry", "field_inquiry"] },
      stage: "new",
      status: "open",
      nextFollowUpAt: { not: null },
    },
    data: { nextFollowUpAt: null },
  });

  console.log(`Cleared nextFollowUpAt on ${result.count} intake leads.`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

