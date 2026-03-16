import { Prisma } from "@prisma/client";
import { BaseRepository } from "./base.repository";
import { DigitalEnquiryWithRelations } from "../dto/response/digital-enquiry.response";

export class DigitalEnquiryRepository extends BaseRepository<DigitalEnquiryWithRelations> {
  /**
   * Find digital enquiry by ID and dealership
   */
  async findByIdAndDealership(
    id: string,
    dealershipId: string,
  ): Promise<DigitalEnquiryWithRelations | null> {
    return this.findOne(this.prisma.digitalEnquiry, { id, dealershipId }, {
      include: {
        contact: true,
        leadSource: true,
        model: { include: { category: true } },
      },
    });
  }

  /**
   * Find digital enquiry by WhatsApp number and dealership
   */
  async findByWhatsAppNumberAndDealership(
    whatsappNumber: string,
    dealershipId: string,
  ): Promise<DigitalEnquiryWithRelations | null> {
    return this.findOne(this.prisma.digitalEnquiry, {
      whatsappNumber,
      dealershipId,
    });
  }

  /**
   * Find all digital enquiries for a dealership with pagination
   */
  async findByDealership(
    dealershipId: string,
    options?: {
      limit?: number;
      skip?: number;
    },
  ): Promise<DigitalEnquiryWithRelations[]> {
    return this.findMany(
      this.prisma.digitalEnquiry,
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
      },
    );
  }

  /**
   * Count digital enquiries for a dealership
   */
  async countByDealership(dealershipId: string): Promise<number> {
    return this.count(this.prisma.digitalEnquiry, { dealershipId });
  }

  /**
   * Create a digital enquiry
   */
  async createEnquiry(
    data: Prisma.DigitalEnquiryCreateInput,
  ): Promise<DigitalEnquiryWithRelations> {
    return this.create(this.prisma.digitalEnquiry, data, {
      include: {
        contact: true,
        leadSource: true,
        model: { include: { category: true } },
      },
    }) as Promise<DigitalEnquiryWithRelations>;
  }

  /**
   * Update a digital enquiry
   */
  async update(
    id: string,
    data: Prisma.DigitalEnquiryUpdateInput,
  ): Promise<DigitalEnquiryWithRelations> {
    return super.update(this.prisma.digitalEnquiry, { id }, data, {
      include: {
        contact: true,
        leadSource: true,
        model: { include: { category: true } },
      },
    }) as Promise<DigitalEnquiryWithRelations>;
  }
}
