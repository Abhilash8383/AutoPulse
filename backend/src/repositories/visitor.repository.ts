import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base.repository";
import { VisitorWithRelations } from "../dto/response/visitor.response";
import { normalizePhoneNumber } from "../utils/phone-formatter";
import { getVisitorPhone } from "../utils/contact-resolver";

const visitorInclude = {
  contact: true,
  sessions: { orderBy: { createdAt: "desc" as const } },
  interests: {
    include: {
      model: { include: { category: true } },
    },
  },
};

export class VisitorRepository extends BaseRepository<VisitorWithRelations> {
  /**
   * Find visitor by ID and dealership
   */
  async findByIdAndDealership(
    id: string,
    dealershipId: string
  ): Promise<VisitorWithRelations | null> {
    return this.findOne(this.prisma.visitor, { id, dealershipId }, {
      include: visitorInclude,
    });
  }

  /**
   * Find visitor by normalized phone number and dealership
   */
  async findByPhoneAndDealership(
    phoneNumber: string,
    dealershipId: string
  ): Promise<VisitorWithRelations | null> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const allVisitors = await this.findMany(
      this.prisma.visitor,
      { dealershipId },
      { include: visitorInclude }
    );
    return (
      allVisitors.find(
        (v) => normalizePhoneNumber(getVisitorPhone(v)) === normalizedPhone
      ) || null
    );
  }

  /**
   * Find all visitors for a dealership with deduplication
   */
  async findByDealershipWithDeduplication(
    dealershipId: string,
    options?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<{
    visitors: VisitorWithRelations[];
    total: number;
  }> {
    const allVisitors = await this.findMany(
      this.prisma.visitor,
      { dealershipId },
      {
        include: visitorInclude,
        orderBy: { createdAt: "desc" },
      }
    );

    // Deduplicate by phone number (from contact or legacy field)
    const visitorMap = new Map<string, VisitorWithRelations>();

    for (const visitor of allVisitors) {
      const normalizedPhone = normalizePhoneNumber(getVisitorPhone(visitor));
      const existing = visitorMap.get(normalizedPhone);

      if (!existing) {
        visitorMap.set(normalizedPhone, visitor);
      } else {
        const existingSessionCount = existing.sessions.length;
        const currentSessionCount = visitor.sessions.length;

        if (
          currentSessionCount > existingSessionCount ||
          (currentSessionCount === existingSessionCount &&
            new Date(visitor.createdAt) > new Date(existing.createdAt))
        ) {
          const mergedSessions = [
            ...existing.sessions,
            ...visitor.sessions,
          ].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          visitorMap.set(normalizedPhone, {
            ...visitor,
            sessions: mergedSessions,
          });
        } else {
          const mergedSessions = [
            ...existing.sessions,
            ...visitor.sessions,
          ].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          visitorMap.set(normalizedPhone, {
            ...existing,
            sessions: mergedSessions,
          });
        }
      }
    }

    const uniqueVisitors = Array.from(visitorMap.values()).sort((a, b) => {
      const aLatest =
        a.sessions.length > 0
          ? new Date(a.sessions[0].createdAt).getTime()
          : new Date(a.createdAt).getTime();
      const bLatest =
        b.sessions.length > 0
          ? new Date(b.sessions[0].createdAt).getTime()
          : new Date(b.createdAt).getTime();
      return bLatest - aLatest;
    });

    const take = options?.limit || 30;
    const offset = options?.skip || 0;
    const paginatedVisitors = uniqueVisitors.slice(offset, offset + take);

    return {
      visitors: paginatedVisitors,
      total: uniqueVisitors.length,
    };
  }

  /**
   * Create a visitor
   */
  async createVisitor(
    data: Prisma.VisitorCreateInput
  ): Promise<VisitorWithRelations> {
    return this.create(this.prisma.visitor, data, {
      include: visitorInclude,
    }) as Promise<VisitorWithRelations>;
  }

  /**
   * Update a visitor
   */
  async update(
    id: string,
    data: Prisma.VisitorUpdateInput
  ): Promise<VisitorWithRelations> {
    return super.update(this.prisma.visitor, { id }, data, {
      include: visitorInclude,
    }) as Promise<VisitorWithRelations>;
  }
}
