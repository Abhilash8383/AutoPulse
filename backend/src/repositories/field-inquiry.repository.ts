import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base.repository";
import { FieldInquiryWithRelations } from "../dto/response/field-inquiry.response";

export class FieldInquiryRepository extends BaseRepository<FieldInquiryWithRelations> {
  /**
   * Find field inquiry by ID and dealership
   */
  async findByIdAndDealership(
    id: string,
    dealershipId: string
  ): Promise<FieldInquiryWithRelations | null> {
    return this.findOne(this.prisma.fieldInquiry, { id, dealershipId }, {
      include: {
        contact: true,
        leadSource: true,
        model: { include: { category: true } },
      },
    });
  }

  /**
   * Find field inquiry by WhatsApp number and dealership
   */
  async findByWhatsAppNumberAndDealership(
    whatsappNumber: string,
    dealershipId: string
  ): Promise<FieldInquiryWithRelations | null> {
    return this.findOne(this.prisma.fieldInquiry, {
      whatsappNumber,
      dealershipId,
    });
  }

  /**
   * Find all field inquiries for a dealership with pagination
   */
  async findByDealership(
    dealershipId: string,
    options?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<FieldInquiryWithRelations[]> {
    return this.findMany(
      this.prisma.fieldInquiry,
      { dealershipId },
      {
        include: {
          contact: true,
          leadSource: true,
          model: { include: { category: true } },
        },
        orderBy: { createdAt: "desc" },
        take: options?.limit,
        skip: options?.skip,
      }
    );
  }

  /**
   * Count field inquiries for a dealership
   */
  async countByDealership(dealershipId: string): Promise<number> {
    return this.count(this.prisma.fieldInquiry, { dealershipId });
  }

  /**
   * Create a field inquiry
   */
  async createInquiry(
    data: Prisma.FieldInquiryCreateInput
  ): Promise<FieldInquiryWithRelations> {
    return this.create(this.prisma.fieldInquiry, data, {
      include: {
        contact: true,
        leadSource: true,
        model: { include: { category: true } },
      },
    }) as Promise<FieldInquiryWithRelations>;
  }

  /**
   * Update a field inquiry
   */
  async update(
    id: string,
    data: Prisma.FieldInquiryUpdateInput
  ): Promise<FieldInquiryWithRelations> {
    return super.update(this.prisma.fieldInquiry, { id }, data, {
      include: {
        contact: true,
        leadSource: true,
        model: { include: { category: true } },
      },
    }) as Promise<FieldInquiryWithRelations>;
  }
}
