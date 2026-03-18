import { Request, Response } from "express";
import { CrmLeadStage, CrmLeadStatus, CrmLeadSourceType } from "@prisma/client";
import { PAGINATION } from "../config/constants";
import { CrmLeadRepository } from "../repositories/crm-lead.repository";
import prisma from "../lib/db";

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof value !== "string") return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export class CrmLeadsController {
  private repository: CrmLeadRepository;

  constructor() {
    this.repository = new CrmLeadRepository();
  }

  /**
   * List CRM leads (pipeline/work queue).
   * GET /api/crm/leads?limit=&skip=&search=&stage=&status=&ownerUserId=&overdue=&sourceType=
   */
  list = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user?.organizationId;
    const dealershipId = req.user?.dealershipId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!organizationId && !dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const limit = parseInt(
      (req.query.limit as string) || String(PAGINATION.DEFAULT_LIMIT),
      10,
    );
    const skip = parseInt(
      (req.query.skip as string) || String(PAGINATION.DEFAULT_SKIP),
      10,
    );
    const search = (req.query.search as string) || undefined;
    const stage = asEnum(req.query.stage, Object.values(CrmLeadStage));
    const status = asEnum(req.query.status, Object.values(CrmLeadStatus));
    const sourceType = asEnum(
      req.query.sourceType,
      Object.values(CrmLeadSourceType),
    );
    const ownerUserId =
      typeof req.query.ownerUserId === "string" ? req.query.ownerUserId : undefined;
    const overdue =
      typeof req.query.overdue === "string"
        ? req.query.overdue === "true"
        : undefined;

    try {
      const { leads, total } =
        isOrgAdmin && organizationId
          ? await this.repository.listByOrganization(organizationId, {
              limit,
              skip,
              search,
              stage,
              status,
              sourceType,
              ownerUserId,
              overdue,
            })
          : await this.repository.listByDealership(dealershipId!, {
              limit,
              skip,
              search,
              stage,
              status,
              sourceType,
              ownerUserId,
              overdue,
            });

      res.json({
        leads,
        total,
        limit,
        skip,
        hasMore: skip + leads.length < total,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Get a CRM lead by ID (tenant-scoped).
   * GET /api/crm/leads/:id
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user?.organizationId;
    const dealershipId = req.user?.dealershipId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!organizationId && !dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const id = req.params.id as string;
    try {
      const lead =
        isOrgAdmin && organizationId
          ? await this.repository.findByIdAndOrganization(id, organizationId)
          : await this.repository.findByIdAndDealership(id, dealershipId!);

      if (!lead) {
        res.status(404).json({ error: "Lead not found" });
        return;
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Update lead stage/status/owner/nextFollowUpAt.
   * PATCH /api/crm/leads/:id
   */
  update = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user?.organizationId;
    const dealershipId = req.user?.dealershipId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!organizationId && !dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const id = req.params.id as string;
    const stage = asEnum(req.body?.stage, Object.values(CrmLeadStage));
    const status = asEnum(req.body?.status, Object.values(CrmLeadStatus));
    const ownerUserId =
      typeof req.body?.ownerUserId === "string"
        ? req.body.ownerUserId
        : req.body?.ownerUserId === null
          ? null
          : undefined;
    const nextFollowUpAt =
      typeof req.body?.nextFollowUpAt === "string"
        ? new Date(req.body.nextFollowUpAt)
        : req.body?.nextFollowUpAt === null
          ? null
          : undefined;

    if (req.body?.stage && !stage) {
      res.status(400).json({ error: "Invalid stage" });
      return;
    }
    if (req.body?.status && !status) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    if (nextFollowUpAt instanceof Date && isNaN(nextFollowUpAt.getTime())) {
      res.status(400).json({ error: "Invalid nextFollowUpAt" });
      return;
    }

    try {
      const existing =
        isOrgAdmin && organizationId
          ? await this.repository.findByIdAndOrganization(id, organizationId)
          : await this.repository.findByIdAndDealership(id, dealershipId!);

      if (!existing) {
        res.status(404).json({ error: "Lead not found" });
        return;
      }

      const ownerUser =
        ownerUserId === undefined
          ? undefined
          : ownerUserId === null
            ? { disconnect: true }
            : { connect: { id: ownerUserId } };

      const updated = await this.repository.updateById(existing.id, {
        stage: stage ?? undefined,
        status: status ?? undefined,
        ownerUser,
        nextFollowUpAt: nextFollowUpAt as any,
      });

      const changes: Record<string, unknown> = {};
      if (stage && stage !== existing.stage) changes.stage = { from: existing.stage, to: stage };
      if (status && status !== existing.status) changes.status = { from: existing.status, to: status };
      if (ownerUserId !== undefined && ownerUserId !== existing.ownerUserId) {
        changes.ownerUserId = { from: existing.ownerUserId, to: ownerUserId };
      }
      if (nextFollowUpAt !== undefined) {
        changes.nextFollowUpAt = {
          from: existing.nextFollowUpAt,
          to: nextFollowUpAt,
        };
      }

      if (Object.keys(changes).length > 0) {
        await prisma.crmTimelineEvent.create({
          data: {
            dealershipId: updated.dealershipId,
            contactId: updated.contactId,
            leadId: updated.id,
            type: "lead_updated",
            payload: changes as any,
            createdByUserId: req.user?.userId ?? null,
          },
        });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Create/Upsert an import lead for an existing contact.
   * POST /api/crm/leads/from-contact
   * body: { contactId }
   */
  fromContact = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user?.organizationId;
    const dealershipId = req.user?.dealershipId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!organizationId && !dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const contactId =
      typeof req.body?.contactId === "string" ? req.body.contactId.trim() : "";
    if (!contactId) {
      res.status(400).json({ error: "contactId is required" });
      return;
    }

    try {
      // Ensure contact exists in scope, and resolve dealershipId for the lead
      let contact:
        | {
            id: string;
            dealershipId: string | null;
          }
        | null = null;

      if (isOrgAdmin && organizationId) {
        const dealerships = await prisma.dealership.findMany({
          where: { organizationId },
          select: { id: true },
        });
        const dealershipIds = dealerships.map((d) => d.id);
        if (dealershipIds.length === 0) {
          res.status(404).json({ error: "Contact not found in scope" });
          return;
        }
        contact = await prisma.contact.findFirst({
          where: { id: contactId, dealershipId: { in: dealershipIds } },
          select: { id: true, dealershipId: true },
        });
      } else {
        contact = await prisma.contact.findFirst({
          where: { id: contactId, dealershipId: dealershipId! },
          select: { id: true, dealershipId: true },
        });
      }

      if (!contact || !contact.dealershipId) {
        res.status(404).json({ error: "Contact not found in scope" });
        return;
      }

      const lead = await this.repository.upsertFromSource({
        dealershipId: contact.dealershipId,
        contactId: contact.id,
        sourceType: "import",
        sourceId: contact.id,
      });

      res.json({ lead });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };
}

