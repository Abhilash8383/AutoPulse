/**
 * =============================================================
 * CONTACT COVERAGE REPORT
 * =============================================================
 * Prints how many Visitor / DigitalEnquiry / FieldInquiry rows
 * are linked to a Contact (contactId set). Use to monitor
 * backfill progress and aim for >= 98% coverage.
 *
 * Usage: pnpm run coverage:contacts
 *    or: npx tsx scripts/contact-coverage.ts
 * =============================================================
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [visitorsTotal, visitorsLinked, digitalTotal, digitalLinked, fieldTotal, fieldLinked] =
    await Promise.all([
      prisma.visitor.count(),
      prisma.visitor.count({ where: { contactId: { not: null } } }),
      prisma.digitalEnquiry.count(),
      prisma.digitalEnquiry.count({ where: { contactId: { not: null } } }),
      prisma.fieldInquiry.count(),
      prisma.fieldInquiry.count({ where: { contactId: { not: null } } }),
    ]);

  const pct = (linked: number, total: number) =>
    total === 0 ? "100" : ((linked / total) * 100).toFixed(1);

  console.log("Contact linkage coverage (contactId set):\n");
  console.log("  Visitor:        ", visitorsLinked, "/", visitorsTotal, "  ", pct(visitorsLinked, visitorsTotal), "%");
  console.log("  DigitalEnquiry: ", digitalLinked, "/", digitalTotal, "  ", pct(digitalLinked, digitalTotal), "%");
  console.log("  FieldInquiry:   ", fieldLinked, "/", fieldTotal, "  ", pct(fieldLinked, fieldTotal), "%");
  console.log("\nTarget: >= 98% before Phase 6 (deprecating duplicate person fields).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
