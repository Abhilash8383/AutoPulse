import { DigitalEnquiryRepository } from "../repositories/digital-enquiry.repository";
import { ContactRepository } from "../repositories/contact.repository";
import { CrmLeadRepository } from "../repositories/crm-lead.repository";
import { CreateDigitalEnquiryDto } from "../dto/request/create-digital-enquiry.dto";
import { UpdateLeadScopeDto } from "../dto/request/update-lead-scope.dto";
import {
  BulkUploadProcessingResult,
  BulkUploadSummary,
} from "../dto/request/bulk-upload.dto";
import {
  DigitalEnquiryWithRelations,
  CreateDigitalEnquiryResponse,
  UpdateLeadScopeResponse,
} from "../dto/response/digital-enquiry.response";
import { whatsappClient } from "../lib/whatsapp";
import { formatPhoneNumber } from "../utils/phone-formatter";
import { validateRequiredColumns, parseExcelDate } from "../utils/excel-parser";
import { BulkUploadRequest, ExcelRow } from "../dto/request/bulk-upload.dto";
import { resolveDisplay } from "../utils/contact-resolver";
import { EXCEL, LEAD_SCOPE, PAGINATION } from "../config/constants";
import prisma from "../lib/db";

export class DigitalEnquiryService {
  private repository: DigitalEnquiryRepository;
  private contactRepository: ContactRepository;
  private crmLeadRepository: CrmLeadRepository;

  constructor() {
    this.repository = new DigitalEnquiryRepository();
    this.contactRepository = new ContactRepository();
    this.crmLeadRepository = new CrmLeadRepository();
  }

  /**
   * Create a digital enquiry
   */
  async createEnquiry(
    data: CreateDigitalEnquiryDto,
    dealershipId: string,
  ): Promise<CreateDigitalEnquiryResponse> {
    const contact = await this.contactRepository.findOrCreate(dealershipId, {
      firstName: data.firstName,
      lastName: data.lastName,
      whatsappNumber: data.whatsappNumber,
      email: data.email ?? undefined,
      address: data.address ?? undefined,
    });

    const enquiry = await this.repository.createEnquiry({
      contact: { connect: { id: contact.id } },
      dealership: { connect: { id: dealershipId } },
      reason: data.reason,
      leadScope: data.leadScope || LEAD_SCOPE.WARM,
      whatsappContactId: null,
      leadSource: data.leadSourceId
        ? { connect: { id: data.leadSourceId } }
        : undefined,
      model: data.interestedModelId
        ? { connect: { id: data.interestedModelId } }
        : undefined,
      variant: data.interestedVariantId
        ? { connect: { id: data.interestedVariantId } }
        : undefined,
      sourceText: data.sourceText || null,
      modelText: data.modelText || null,
    });

    await this.crmLeadRepository.upsertFromSource({
      dealershipId,
      contactId: contact.id,
      sourceType: "digital_enquiry",
      sourceId: enquiry.id,
    });

    // Get WhatsApp template
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId,
        type: "digital_enquiry",
        section: "digital_enquiry",
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
        console.error("Failed to send digital enquiry message:", error);
        messageStatus = "failed";
        messageError =
          (error as Error).message || "Failed to send digital enquiry message";
      }
    } else if (template && (!template.templateId || !template.templateName)) {
      messageStatus = "not_configured";
      messageError = "Template ID or Template Name not configured";
    }

    const resolved = resolveDisplay(enquiry);
    return {
      success: true,
      enquiry: {
        id: enquiry.id,
        firstName: resolved.firstName,
        lastName: resolved.lastName,
      },
      message: {
        status: messageStatus,
        error: messageError,
      },
    };
  }

  /**
   * Get digital enquiries with pagination
   */
  async getEnquiries(
    dealershipId: string,
    limit?: number,
    skip?: number,
  ): Promise<{
    enquiries: DigitalEnquiryWithRelations[];
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
      enquiries: enquiries.map((e) => resolveDisplay(e)),
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
    dealershipId: string,
  ): Promise<UpdateLeadScopeResponse> {
    // Verify enquiry exists and belongs to dealership
    const enquiry = await this.repository.findByIdAndDealership(
      id,
      dealershipId,
    );
    if (!enquiry) {
      throw new Error("Enquiry not found");
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
      enquiry: resolveDisplay(updatedEnquiry),
    };
  }

  /**
   * Bulk upload digital enquiries from JSON data
   */
  async bulkUpload(
    data: BulkUploadRequest,
    dealershipId: string,
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
      Array.from(EXCEL.REQUIRED_COLUMNS.DIGITAL_ENQUIRY),
    );

    if (!columnValidation.valid) {
      throw new Error(
        `Missing required columns: ${columnValidation.missingColumns.join(
          ", ",
        )}`,
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
            type: "digital_enquiry",
            section: "digital_enquiry",
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
          (m) => m.name.toLowerCase() === modelName.toLowerCase(),
        );

        // Match lead source
        let leadSourceId: string | null = null;
        let sourceText: string | null = null;
        if (row.Source) {
          const sourceName = String(row.Source).trim();
          const matchedSource = allLeadSources.find(
            (s) => s.name.toLowerCase() === sourceName.toLowerCase(),
          );
          if (matchedSource) {
            leadSourceId = matchedSource.id;
          } else {
            // Store source name as text if not found in database
            sourceText = sourceName;
          }
        }

        if (!leadSourceId && defaultLeadSource) {
          leadSourceId = defaultLeadSource.id;
        }

        const whatsappNumber = String(row["WhatsApp Number"]).trim();
        const address = row.Location ? String(row.Location).trim() : undefined;

        // Check if enquiry already exists
        const existingEnquiry =
          await this.repository.findByWhatsAppNumberAndDealership(
            whatsappNumber,
            dealershipId,
          );

        const contact = await this.contactRepository.findOrCreate(dealershipId, {
          firstName,
          lastName,
          whatsappNumber,
          address: address ?? undefined,
        });

        const enquiry = await this.repository.createEnquiry({
          contact: { connect: { id: contact.id } },
          dealership: { connect: { id: dealershipId } },
          reason: modelName || "Bulk imported enquiry",
          leadScope: LEAD_SCOPE.WARM,
          whatsappContactId: null,
          leadSource: leadSourceId
            ? { connect: { id: leadSourceId } }
            : undefined,
          model: matchedModel
            ? { connect: { id: matchedModel.id } }
            : undefined,
          variant: undefined,
          modelText: matchedModel ? null : modelName,
          sourceText: sourceText,
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
              error,
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
