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

export class CrmNotesController {
  /**
   * GET /api/crm/notes?contactId=&leadId=
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

    const notes = await prisma.crmNote.findMany({
      where: {
        dealershipId: { in: dealershipIds },
        contactId,
        ...(leadId ? { leadId } : {}),
      },
      include: { createdByUser: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ notes });
  };

  /**
   * POST /api/crm/notes
   * body: { contactId, leadId?, body }
   */
  create = async (req: Request, res: Response): Promise<void> => {
    const contactId = typeof req.body?.contactId === "string" ? req.body.contactId : null;
    const leadId = typeof req.body?.leadId === "string" ? req.body.leadId : undefined;
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!contactId || !body) {
      res.status(400).json({ error: "contactId and body are required" });
      return;
    }

    const dealershipIds = await getScopedDealershipIds(req);
    if (!dealershipIds || dealershipIds.length === 0) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    // Pick the dealershipId from the lead if provided, else from contact.
    let dealershipId: string | null = null;
    if (leadId) {
      const lead = await prisma.crmLead.findFirst({
        where: { id: leadId, dealershipId: { in: dealershipIds } },
        select: { dealershipId: true },
      });
      dealershipId = lead?.dealershipId ?? null;
    }
    if (!dealershipId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, dealershipId: { in: dealershipIds } },
        select: { dealershipId: true },
      });
      dealershipId = contact?.dealershipId ?? null;
    }
    if (!dealershipId) {
      res.status(404).json({ error: "Contact/lead not found in scope" });
      return;
    }

    const note = await prisma.crmNote.create({
      data: {
        dealershipId,
        contactId,
        leadId: leadId ?? null,
        body,
        createdByUserId: req.user?.userId ?? null,
      },
      include: { createdByUser: { select: { id: true, email: true } } },
    });

    await prisma.crmTimelineEvent.create({
      data: {
        dealershipId,
        contactId,
        leadId: leadId ?? null,
        type: "note_added",
        payload: { noteId: note.id },
        createdByUserId: req.user?.userId ?? null,
      },
    });

    res.json(note);
  };
}

