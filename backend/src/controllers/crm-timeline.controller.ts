import { Request, Response } from "express";
import prisma from "../lib/db";

async function getScopedDealershipIds(req: Request): Promise<string[] | null> {
  const dealershipId = req.user?.dealershipId;
  if (dealershipId) return [dealershipId];
  const isOrgAdmin = req.user?.role === "super_admin" || req.user?.role === "admin";
  const organizationId = req.user?.organizationId;
  if (!isOrgAdmin || !organizationId) return null;
  const dealerships = await prisma.dealership.findMany({
    where: { organizationId },
    select: { id: true },
  });
  return dealerships.map((d) => d.id);
}

export class CrmTimelineController {
  /**
   * GET /api/crm/timeline?contactId=&leadId=
   */
  list = async (req: Request, res: Response): Promise<void> => {
    const contactId = typeof req.query.contactId === "string" ? req.query.contactId : null;
    const leadId = typeof req.query.leadId === "string" ? req.query.leadId : undefined;
    if (!contactId) {
      res.status(400).json({ error: "contactId is required" });
      return;
    }
    const dealershipIds = await getScopedDealershipIds(req);
    if (!dealershipIds || dealershipIds.length === 0) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const events = await prisma.crmTimelineEvent.findMany({
      where: {
        dealershipId: { in: dealershipIds },
        contactId,
        ...(leadId ? { leadId } : {}),
      },
      include: { createdByUser: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ events });
  };
}

