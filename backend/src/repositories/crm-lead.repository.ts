import {
  Prisma,
  CrmLeadStage,
  CrmLeadStatus,
  CrmLeadSourceType,
} from "@prisma/client";
import { BaseRepository } from "./base.repository";

export class CrmLeadRepository extends BaseRepository<
  Prisma.CrmLeadGetPayload<{
    include: { contact: true; ownerUser: { select: { id: true; email: true } } };
  }>
> {
  async upsertFromSource(input: {
    dealershipId: string;
    contactId: string;
    sourceType: CrmLeadSourceType;
    sourceId: string;
    nextFollowUpAt?: Date | null;
  }) {
    // Default follow-up behavior:
    // - intake leads (walk-in/digital/field) start with no follow-up until set by staff
    // - import leads (converted contacts) get a default follow-up of +1 day
    const nextFollowUpAt =
      input.nextFollowUpAt !== undefined
        ? input.nextFollowUpAt
        : input.sourceType === "import"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null;

    const existing = await this.prisma.crmLead.findUnique({
      where: {
        dealershipId_sourceType_sourceId: {
          dealershipId: input.dealershipId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      select: { id: true, contactId: true },
    });

    if (existing) {
      return this.prisma.crmLead.update({
        where: { id: existing.id },
        data: {
          contactId: input.contactId,
          status: "open",
          nextFollowUpAt: nextFollowUpAt ?? undefined,
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.crmLead.create({
        data: {
          dealershipId: input.dealershipId,
          contactId: input.contactId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          stage: "new",
          status: "open",
          nextFollowUpAt,
        },
      });
      await tx.crmTimelineEvent.create({
        data: {
          dealershipId: input.dealershipId,
          contactId: input.contactId,
          leadId: lead.id,
          type: "lead_created",
          payload: { sourceType: input.sourceType, sourceId: input.sourceId },
        },
      });
      return lead;
    });
  }

  async updateById(
    id: string,
    data: Prisma.CrmLeadUpdateInput,
  ): Promise<
    Prisma.CrmLeadGetPayload<{
      include: { contact: true; ownerUser: { select: { id: true; email: true } } };
    }>
  > {
    return this.prisma.crmLead.update({
      where: { id },
      data,
      include: {
        contact: true,
        ownerUser: { select: { id: true, email: true } },
      },
    });
  }

  async findByIdAndDealership(id: string, dealershipId: string) {
    return this.prisma.crmLead.findFirst({
      where: { id, dealershipId },
      include: {
        contact: true,
        ownerUser: { select: { id: true, email: true } },
      },
    });
  }

  async findByIdAndOrganization(id: string, organizationId: string) {
    const dealerships = await this.prisma.dealership.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const dealershipIds = dealerships.map((d) => d.id);
    if (dealershipIds.length === 0) return null;
    return this.prisma.crmLead.findFirst({
      where: { id, dealershipId: { in: dealershipIds } },
      include: {
        contact: true,
        ownerUser: { select: { id: true, email: true } },
      },
    });
  }

  async listByDealership(
    dealershipId: string,
    options?: {
      limit?: number;
      skip?: number;
      search?: string;
      stage?: CrmLeadStage;
      status?: CrmLeadStatus;
      ownerUserId?: string;
      overdue?: boolean;
      sourceType?: CrmLeadSourceType;
    },
  ): Promise<{ leads: any[]; total: number }> {
    const where = this.buildWhere({
      dealershipId,
      dealershipIds: null,
      ...options,
    });
    return this.list(where, options);
  }

  async listByOrganization(
    organizationId: string,
    options?: {
      limit?: number;
      skip?: number;
      search?: string;
      stage?: CrmLeadStage;
      status?: CrmLeadStatus;
      ownerUserId?: string;
      overdue?: boolean;
      sourceType?: CrmLeadSourceType;
    },
  ): Promise<{ leads: any[]; total: number }> {
    const dealerships = await this.prisma.dealership.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const dealershipIds = dealerships.map((d) => d.id);
    if (dealershipIds.length === 0) return { leads: [], total: 0 };

    const where = this.buildWhere({
      dealershipId: null,
      dealershipIds,
      ...options,
    });
    return this.list(where, options);
  }

  private buildWhere(input: {
    dealershipId: string | null;
    dealershipIds: string[] | null;
    search?: string;
    stage?: CrmLeadStage;
    status?: CrmLeadStatus;
    ownerUserId?: string;
    overdue?: boolean;
    sourceType?: CrmLeadSourceType;
  }): Prisma.CrmLeadWhereInput {
    const where: Prisma.CrmLeadWhereInput = {};

    if (input.dealershipId != null) where.dealershipId = input.dealershipId;
    else if (input.dealershipIds && input.dealershipIds.length > 0) {
      where.dealershipId = { in: input.dealershipIds };
    }

    if (input.stage) where.stage = input.stage;
    if (input.status) where.status = input.status;
    if (input.ownerUserId) where.ownerUserId = input.ownerUserId;
    if (input.sourceType) where.sourceType = input.sourceType;

    if (input.overdue) {
      where.status = input.status ?? "open";
      where.nextFollowUpAt = { lt: new Date() };
    }

    if (input.search?.trim()) {
      const q = input.search.trim();
      where.OR = [
        { contact: { firstName: { contains: q, mode: "insensitive" } } },
        { contact: { lastName: { contains: q, mode: "insensitive" } } },
        { contact: { whatsappNumber: { contains: q } } },
        { contact: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    return where;
  }

  private async list(
    where: Prisma.CrmLeadWhereInput,
    options?: { limit?: number; skip?: number },
  ): Promise<{ leads: any[]; total: number }> {
    const [leads, total] = await Promise.all([
      this.prisma.crmLead.findMany({
        where,
        include: {
          contact: true,
          ownerUser: { select: { id: true, email: true } },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: options?.limit ?? 50,
        skip: options?.skip ?? 0,
      }),
      this.prisma.crmLead.count({ where }),
    ]);
    return { leads, total };
  }
}

