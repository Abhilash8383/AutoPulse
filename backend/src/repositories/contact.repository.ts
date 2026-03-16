import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base.repository";
import { normalizePhoneNumber } from "../utils/phone-formatter";

export interface ContactPayload {
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email?: string | null;
  address?: string | null;
}

/**
 * Contact repository for canonical CRM person records.
 * Used for find-or-create by tenant + normalized phone and for backfill.
 */
export class ContactRepository extends BaseRepository<Prisma.ContactGetPayload<object>> {
  /**
   * Find contact by dealership and normalized WhatsApp number.
   */
  async findByDealershipAndPhone(
    dealershipId: string,
    whatsappNumber: string,
  ): Promise<Prisma.ContactGetPayload<object> | null> {
    const normalized = normalizePhoneNumber(whatsappNumber);
    const contacts = await this.findMany(this.prisma.contact, {
      dealershipId,
    });
    return (
      contacts.find((c) => normalizePhoneNumber(c.whatsappNumber) === normalized) ?? null
    );
  }

  /**
   * Find or create a contact by dealership + phone. Idempotent.
   * Merges name/email/address if contact exists.
   */
  async findOrCreate(
    dealershipId: string,
    payload: ContactPayload,
  ): Promise<Prisma.ContactGetPayload<object>> {
    const existing = await this.findByDealershipAndPhone(
      dealershipId,
      payload.whatsappNumber,
    );
    if (existing) {
      const updated = await this.prisma.contact.update({
        where: { id: existing.id },
        data: {
          firstName: payload.firstName || existing.firstName,
          lastName: payload.lastName || existing.lastName,
          email: payload.email ?? existing.email,
          address: payload.address ?? existing.address,
        },
      });
      return updated;
    }
    return this.prisma.contact.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        whatsappNumber: payload.whatsappNumber,
        email: payload.email ?? null,
        address: payload.address ?? null,
        dealershipId,
      },
    });
  }

  /**
   * Find by ID and dealership (tenant-safe).
   */
  async findByIdAndDealership(
    id: string,
    dealershipId: string,
  ): Promise<Prisma.ContactGetPayload<object> | null> {
    return this.findOne(this.prisma.contact, { id, dealershipId });
  }

  /**
   * List contacts for a dealership with pagination.
   */
  async findByDealership(
    dealershipId: string,
    options?: { limit?: number; skip?: number; search?: string },
  ): Promise<{ contacts: Prisma.ContactGetPayload<object>[]; total: number }> {
    const where: Prisma.ContactWhereInput = { dealershipId };
    if (options?.search?.trim()) {
      const q = `%${options.search.trim()}%`;
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { whatsappNumber: { contains: options.search.trim() } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.skip ?? 0,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { contacts, total };
  }
}
