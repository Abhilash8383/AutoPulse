import { FieldInquiryRepository } from "../repositories/field-inquiry.repository";
import { ContactRepository } from "../repositories/contact.repository";
import { CreateFieldInquiryDto } from "../dto/request/create-field-inquiry.dto";
import { UpdateLeadScopeDto } from "../dto/request/update-lead-scope.dto";
import {
  BulkUploadProcessingResult,
  BulkUploadSummary,
} from "../dto/request/bulk-upload.dto";
import {
  FieldInquiryWithRelations,
  CreateFieldInquiryResponse,
  UpdateLeadScopeResponse,
} from "../dto/response/field-inquiry.response";
import { whatsappClient } from "../lib/whatsapp";
import { validateRequiredColumns, parseExcelDate } from "../utils/excel-parser";
import { BulkUploadRequest, ExcelRow } from "../dto/request/bulk-upload.dto";
import { EXCEL, LEAD_SCOPE, PAGINATION } from "../config/constants";
import prisma from "../lib/db";

export class FieldInquiryService {
  private repository: FieldInquiryRepository;
  private contactRepository: ContactRepository;

  constructor() {
    this.repository = new FieldInquiryRepository();
    this.contactRepository = new ContactRepository();
  }

  /**
   * Create a field inquiry
   */
  async createInquiry(
    data: CreateFieldInquiryDto,
    dealershipId: string
  ): Promise<CreateFieldInquiryResponse> {
    // Check if enquiry already exists
    const existingInquiry =
      await this.repository.findByWhatsAppNumberAndDealership(
        data.whatsappNumber,
        dealershipId
      );

    // Create field inquiry
    const enquiry = await this.repository.createInquiry({
      firstName: data.firstName,
      lastName: data.lastName,
      whatsappNumber: data.whatsappNumber,
      email: data.email || null,
      address: data.address || null,
      reason: data.reason,
      leadScope: data.leadScope || LEAD_SCOPE.WARM,
      whatsappContactId: null,
      dealership: {
        connect: { id: dealershipId },
      },
      leadSource: data.leadSourceId
        ? { connect: { id: data.leadSourceId } }
        : undefined,
      model: data.interestedModelId
        ? { connect: { id: data.interestedModelId } }
        : undefined,
      variant: data.interestedVariantId
        ? { connect: { id: data.interestedVariantId } }
        : undefined,
    });

    // Dual-write: ensure Contact exists and link enquiry
    const contact = await this.contactRepository.findOrCreate(dealershipId, {
      firstName: enquiry.firstName,
      lastName: enquiry.lastName,
      whatsappNumber: enquiry.whatsappNumber,
      email: enquiry.email ?? undefined,
      address: enquiry.address ?? undefined,
    });
    await this.repository.update(enquiry.id, {
      contact: { connect: { id: contact.id } },
    });

    // Get WhatsApp template
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId,
        type: "field_inquiry",
        section: "field_inquiry",
      },
    });

    let messageStatus: "sent" | "failed" | "not_sent" | "not_configured" =
      "not_sent";
    let messageError: string | null = null;

    if (template && template.templateId && template.templateName) {
      try {
        await whatsappClient.sendTemplate({
          contactNumber: data.whatsappNumber,
          templateName: template.templateName,
          templateId: template.templateId,
          templateLanguage: template.language,
          parameters: [],
        });
        messageStatus = "sent";
      } catch (error: unknown) {
        console.error("Failed to send field inquiry message:", error);
        messageStatus = "failed";
        messageError =
          (error as Error).message || "Failed to send field inquiry message";
      }
    } else if (template && (!template.templateId || !template.templateName)) {
      messageStatus = "not_configured";
      messageError = "Template ID or Template Name not configured";
    }

    return {
      success: true,
      enquiry: {
        id: enquiry.id,
        firstName: enquiry.firstName,
        lastName: enquiry.lastName,
      },
      message: {
        status: messageStatus,
        error: messageError,
      },
    };
  }

  /**
   * Get field inquiries with pagination
   */
  async getInquiries(
    dealershipId: string,
    limit?: number,
    skip?: number
  ): Promise<{
    enquiries: FieldInquiryWithRelations[];
    hasMore: boolean;
    total: number;
    skip: number;
    limit: number;
  }> {
    const take = limit || PAGINATION.DEFAULT_LIMIT;
    const offset = skip || PAGINATION.DEFAULT_SKIP;

    const [enquiries, total] = await Promise.all([
      this.repository.findByDealership(dealershipId, {
        limit: take,
        skip: offset,
      }),
      this.repository.countByDealership(dealershipId),
    ]);

    const hasMore = offset + take < total;

    return {
      enquiries,
      hasMore,
      total,
      skip: offset,
      limit: take,
    };
  }

  /**
   * Update lead scope
   */
  async updateLeadScope(
    id: string,
    data: UpdateLeadScopeDto,
    dealershipId: string
  ): Promise<UpdateLeadScopeResponse> {
    // Verify enquiry exists and belongs to dealership
    const enquiry = await this.repository.findByIdAndDealership(
      id,
      dealershipId
    );
    if (!enquiry) {
      throw new Error("Inquiry not found");
    }

    // Validate lead scope
    if (!Object.values(LEAD_SCOPE).includes(data.leadScope as any)) {
      throw new Error("Invalid leadScope. Must be 'hot', 'warm', or 'cold'");
    }

    const updatedEnquiry = await this.repository.update(id, {
      leadScope: data.leadScope,
    });

    return {
      success: true,
      enquiry: updatedEnquiry,
    };
  }

  /**
   * Bulk upload field inquiries from JSON data
   */
  async bulkUpload(
    data: BulkUploadRequest,
    dealershipId: string
  ): Promise<{
    success: boolean;
    summary: BulkUploadSummary;
    results: BulkUploadProcessingResult[];
  }> {
    const rows = data.rows;

    if (!rows || rows.length === 0) {
      throw new Error("No data provided");
    }

    // Validate required columns
    const firstRow = rows[0];
    const columnValidation = validateRequiredColumns(
      firstRow,
      Array.from(EXCEL.REQUIRED_COLUMNS.FIELD_INQUIRY)
    );

    if (!columnValidation.valid) {
      throw new Error(
        `Missing required columns: ${columnValidation.missingColumns.join(
          ", "
        )}`
      );
    }

    // Get default lead source and models
    const [defaultLeadSource, allModels, allLeadSources, template] =
      await Promise.all([
        prisma.leadSource.findFirst({
          where: {
            dealershipId,
            isDefault: true,
          },
        }),
        prisma.vehicleModel.findMany({
          where: {
            category: {
              dealershipId,
            },
          },
          include: {
            category: true,
          },
        }),
        prisma.leadSource.findMany({
          where: {
            dealershipId,
          },
        }),
        prisma.whatsAppTemplate.findFirst({
          where: {
            dealershipId,
            type: "field_inquiry",
            section: "field_inquiry",
          },
        }),
      ]);

    const results: BulkUploadProcessingResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have header

      try {
        // Validate required fields
        if (!row.Name || !row["WhatsApp Number"] || !row.Model) {
          results.push({
            success: false,
            rowNumber,
            error: "Missing required data (Name, WhatsApp Number, or Model)",
          });
          errorCount++;
          continue;
        }

        // Parse name
        const nameParts = String(row.Name).trim().split(/\s+/);
        if (nameParts.length === 0) {
          results.push({
            success: false,
            rowNumber,
            error: "Name is empty",
          });
          errorCount++;
          continue;
        }

        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        // Parse date
        const date = parseExcelDate(row.Date);

        // Match model (optional - no error if not found)
        const modelName = String(row.Model).trim();
        const matchedModel = allModels.find(
          (m) => m.name.toLowerCase() === modelName.toLowerCase()
        );

        // Match lead source
        let leadSourceId: string | null = null;
        if (row.Source) {
          const sourceName = String(row.Source).trim();
          const matchedSource = allLeadSources.find(
            (s) => s.name.toLowerCase() === sourceName.toLowerCase()
          );
          leadSourceId = matchedSource?.id || null;
        }

        if (!leadSourceId && defaultLeadSource) {
          leadSourceId = defaultLeadSource.id;
        }

        const whatsappNumber = String(row["WhatsApp Number"]).trim();
        const address = row.Location ? String(row.Location).trim() : undefined;

        // Check if enquiry already exists
        const existingInquiry =
          await this.repository.findByWhatsAppNumberAndDealership(
            whatsappNumber,
            dealershipId
          );

        // Create field inquiry
        const enquiry = await this.repository.createInquiry({
          firstName,
          lastName,
          whatsappNumber,
          email: null,
          address: address || null,
          reason: date
            ? `Inquiry from ${date.toLocaleDateString()}`
            : "Bulk imported inquiry",
          leadScope: LEAD_SCOPE.COLD,
          whatsappContactId: null,
          dealership: {
            connect: { id: dealershipId },
          },
          leadSource: leadSourceId
            ? { connect: { id: leadSourceId } }
            : undefined,
          model: matchedModel
            ? { connect: { id: matchedModel.id } }
            : undefined,
          variant: undefined,
        });

        // Dual-write: link enquiry to Contact
        const contact = await this.contactRepository.findOrCreate(dealershipId, {
          firstName,
          lastName,
          whatsappNumber,
          address: address ?? undefined,
        });
        await this.repository.update(enquiry.id, {
          contact: { connect: { id: contact.id } },
        });

        // Send WhatsApp message if template is configured
        if (template && template.templateId && template.templateName) {
          try {
            await whatsappClient.sendTemplate({
              contactNumber: whatsappNumber,
              templateName: template.templateName,
              templateId: template.templateId,
              templateLanguage: template.language,
              parameters: [],
            });
          } catch (error: unknown) {
            console.error(
              `Failed to send WhatsApp message for row ${rowNumber}:`,
              error
            );
            // Don't fail the row if message sending fails
          }
        }

        results.push({
          success: true,
          rowNumber,
          enquiryId: enquiry.id,
        });
        successCount++;
      } catch (error: unknown) {
        results.push({
          success: false,
          rowNumber,
          error: (error as Error).message || "Unknown error",
        });
        errorCount++;
      }
    }

    return {
      success: true,
      summary: {
        total: rows.length,
        success: successCount,
        errors: errorCount,
      },
      results,
    };
  }
}
