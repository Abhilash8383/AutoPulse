import { Request, Response } from "express";
import prisma from "../lib/db";
import { CrmLeadStatus } from "@prisma/client";

async function getScopedDealershipIds(req: Request): Promise<string[] | null> {
  const isOrgAdmin = req.user?.role === "super_admin" || req.user?.role === "admin";
  const organizationId = req.user?.organizationId;
  if (isOrgAdmin && organizationId) {
    const dealerships = await prisma.dealership.findMany({
      where: { organizationId },
      select: { id: true },
    });
    return dealerships.map((d) => d.id);
  }

  const dealershipId = req.user?.dealershipId;
  if (dealershipId) return [dealershipId];

  return null;
}

function getPeriodStarts(now: Date) {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7;
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - mondayOffset);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return { startOfDay, startOfWeek, startOfMonth, startOfYear };
}

export class CrmOverviewController {
  /**
   * GET /api/crm/overview
   */
  get = async (req: Request, res: Response): Promise<void> => {
    const dealershipIds = await getScopedDealershipIds(req);
    if (!dealershipIds || dealershipIds.length === 0) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const now = new Date();
    const { startOfDay, startOfWeek, startOfMonth, startOfYear } = getPeriodStarts(now);

    const contactWhere = { dealershipId: { in: dealershipIds } };
    const leadWhere = { dealershipId: { in: dealershipIds } };
    const clearedWhere = {
      dealershipId: { in: dealershipIds },
      status: { in: [CrmLeadStatus.won, CrmLeadStatus.lost] },
    };

    const [
      contactsToday,
      contactsWeek,
      contactsMonth,
      contactsYear,
      contactsLifetime,
      leadsTotal,
      leadsOpen,
      leadsWon,
      leadsLost,
      clearedToday,
      clearedWeek,
      clearedMonth,
      clearedYear,
      clearedLifetime,
      ownerStatusRows,
    ] = await Promise.all([
      prisma.contact.count({ where: { ...contactWhere, createdAt: { gte: startOfDay } } }),
      prisma.contact.count({ where: { ...contactWhere, createdAt: { gte: startOfWeek } } }),
      prisma.contact.count({ where: { ...contactWhere, createdAt: { gte: startOfMonth } } }),
      prisma.contact.count({ where: { ...contactWhere, createdAt: { gte: startOfYear } } }),
      prisma.contact.count({ where: contactWhere }),
      prisma.crmLead.count({ where: leadWhere }),
      prisma.crmLead.count({ where: { ...leadWhere, status: CrmLeadStatus.open } }),
      prisma.crmLead.count({ where: { ...leadWhere, status: CrmLeadStatus.won } }),
      prisma.crmLead.count({ where: { ...leadWhere, status: CrmLeadStatus.lost } }),
      prisma.crmLead.count({ where: { ...clearedWhere, updatedAt: { gte: startOfDay } } }),
      prisma.crmLead.count({ where: { ...clearedWhere, updatedAt: { gte: startOfWeek } } }),
      prisma.crmLead.count({ where: { ...clearedWhere, updatedAt: { gte: startOfMonth } } }),
      prisma.crmLead.count({ where: { ...clearedWhere, updatedAt: { gte: startOfYear } } }),
      prisma.crmLead.count({ where: clearedWhere }),
      prisma.crmLead.groupBy({
        by: ["ownerUserId", "status"],
        where: leadWhere,
        _count: { _all: true },
      }),
    ]);

    const ownerIds = Array.from(
      new Set(
        ownerStatusRows
          .map((r) => r.ownerUserId)
          .filter((id): id is string => typeof id === "string"),
      ),
    );

    const users = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, email: true },
        })
      : [];
    const userEmailById = new Map(users.map((u) => [u.id, u.email]));

    const ownerMap = new Map<
      string,
      {
        ownerUserId: string | null;
        ownerEmail: string;
        totalAssigned: number;
        open: number;
        won: number;
        lost: number;
        cleared: number;
      }
    >();

    for (const row of ownerStatusRows) {
      const ownerKey = row.ownerUserId ?? "unassigned";
      if (!ownerMap.has(ownerKey)) {
        ownerMap.set(ownerKey, {
          ownerUserId: row.ownerUserId,
          ownerEmail:
            row.ownerUserId == null
              ? "Unassigned"
              : (userEmailById.get(row.ownerUserId) ?? "Unknown user"),
          totalAssigned: 0,
          open: 0,
          won: 0,
          lost: 0,
          cleared: 0,
        });
      }

      const bucket = ownerMap.get(ownerKey)!;
      const count = row._count._all;
      bucket.totalAssigned += count;
      if (row.status === CrmLeadStatus.open) bucket.open += count;
      if (row.status === CrmLeadStatus.won) bucket.won += count;
      if (row.status === CrmLeadStatus.lost) bucket.lost += count;
      if (row.status === CrmLeadStatus.won || row.status === CrmLeadStatus.lost) {
        bucket.cleared += count;
      }
    }

    const owners = Array.from(ownerMap.values()).sort((a, b) => {
      if (b.cleared !== a.cleared) return b.cleared - a.cleared;
      return b.totalAssigned - a.totalAssigned;
    });

    res.json({
      contactsCreated: {
        day: contactsToday,
        week: contactsWeek,
        month: contactsMonth,
        year: contactsYear,
        lifetime: contactsLifetime,
      },
      leads: {
        total: leadsTotal,
        open: leadsOpen,
        won: leadsWon,
        lost: leadsLost,
      },
      clearedLeads: {
        day: clearedToday,
        week: clearedWeek,
        month: clearedMonth,
        year: clearedYear,
        lifetime: clearedLifetime,
      },
      ownerPerformance: owners,
      generatedAt: now.toISOString(),
    });
  };
}
