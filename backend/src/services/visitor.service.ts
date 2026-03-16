import { VisitorRepository } from "../repositories/visitor.repository";
import { ContactRepository } from "../repositories/contact.repository";
import { CreateVisitorDto } from "../dto/request/create-visitor.dto";
import { CreateSessionDto } from "../dto/request/create-session.dto";
import {
  VisitorWithRelations,
  CreateVisitorResponse,
  CreateSessionResponse,
  VisitorLookupResponse,
} from "../dto/response/visitor.response";
import { whatsappClient } from "../lib/whatsapp";
import { normalizePhoneNumber } from "../utils/phone-formatter";
import { PAGINATION } from "../config/constants";
import prisma from "../lib/db";

export class VisitorService {
  private repository: VisitorRepository;
  private contactRepository: ContactRepository;

  constructor() {
    this.repository = new VisitorRepository();
    this.contactRepository = new ContactRepository();
  }

  /**
   * Create a visitor (or update existing) and create a session
   */
  async createVisitor(
    data: CreateVisitorDto,
    dealershipId: string,
  ): Promise<CreateVisitorResponse> {
    const normalizedPhone = normalizePhoneNumber(data.whatsappNumber);

    // Find existing visitor by normalized phone
    let visitor = await this.repository.findByPhoneAndDealership(
      data.whatsappNumber,
      dealershipId,
    );

    const isNewVisitor = !visitor;

    if (visitor) {
      // Update visitor info
      visitor = await this.repository.update(visitor.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || visitor.email,
        address: data.address || visitor.address,
      });
    } else {
      // Create new visitor
      visitor = await this.repository.createVisitor({
        firstName: data.firstName,
        lastName: data.lastName,
        whatsappNumber: data.whatsappNumber,
        email: data.email || null,
        address: data.address || null,
        whatsappContactId: null,
        dealership: {
          connect: { id: dealershipId },
        },
        sessions: {
          create: [],
        },
        interests: {
          create: [],
        },
      });
    }

    if (!visitor) {
      throw new Error("Failed to create or find visitor");
    }

    // Dual-write: ensure Contact exists and link visitor
    const contact = await this.contactRepository.findOrCreate(dealershipId, {
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      whatsappNumber: visitor.whatsappNumber,
      email: visitor.email ?? undefined,
      address: visitor.address ?? undefined,
    });
    if (!visitor.contactId) {
      await this.repository.update(visitor.id, { contact: { connect: { id: contact.id } } });
    }

    const visitorId = visitor.id;
    const sessionCount = visitor.sessions?.length || 0;
    const visitNumber = sessionCount + 1;

    // Create session
    const session = await prisma.visitorSession.create({
      data: {
        reason: data.reason,
        visitorId: visitorId,
        status: "intake",
      },
    });

    // Create interests if provided
    if (data.modelIds && data.modelIds.length > 0) {
      await prisma.visitorInterest.createMany({
        data: data.modelIds.map(
          (item: string | { modelId: string; variantId?: string }) => {
            if (typeof item === "string") {
              return {
                visitorId: visitorId,
                modelId: item,
                sessionId: session.id,
              };
            } else {
              return {
                visitorId: visitorId,
                modelId: item.modelId,
                variantId: item.variantId || null,
                sessionId: session.id,
              };
            }
          },
        ),
      });
    }

    // Send WhatsApp message
    let messageStatus: "sent" | "failed" | "not_sent" | "not_configured" =
      "not_sent";
    let messageError: string | null = null;
    const name = `${data.firstName} ${data.lastName}`;

    if (isNewVisitor && sessionCount === 0) {
      // Send welcome message for new visitor
      const welcomeTemplate = await prisma.whatsAppTemplate.findFirst({
        where: {
          dealershipId,
          type: "welcome",
        },
      });

      if (welcomeTemplate) {
        try {
          await whatsappClient.sendTemplate({
            contactNumber: data.whatsappNumber,
            templateName: welcomeTemplate.templateName,
            templateId: welcomeTemplate.templateId,
            templateLanguage: welcomeTemplate.language,
            parameters: [name],
          });
          messageStatus = "sent";
        } catch (error: unknown) {
          console.error("Failed to send welcome message:", error);
          messageStatus = "failed";
          messageError =
            (error as Error).message || "Failed to send welcome message";
        }
      }
    } else {
      // Send return visit message
      const returnVisitTemplate = await prisma.whatsAppTemplate.findFirst({
        where: {
          dealershipId,
          type: "return_visit",
        },
      });

      if (returnVisitTemplate) {
        try {
          const visitLabel =
            visitNumber === 1
              ? "1st"
              : visitNumber === 2
                ? "2nd"
                : visitNumber === 3
                  ? "3rd"
                  : `${visitNumber}th`;

          await whatsappClient.sendTemplate({
            contactNumber: data.whatsappNumber,
            templateName: returnVisitTemplate.templateName,
            templateId: returnVisitTemplate.templateId,
            templateLanguage: returnVisitTemplate.language,
            parameters: [visitor.firstName, visitLabel],
          });
          messageStatus = "sent";
        } catch (error: unknown) {
          console.error("Failed to send return visit message:", error);
          messageStatus = "failed";
          messageError =
            (error as Error).message || "Failed to send return visit message";
        }
      } else {
        // Fallback to welcome template
        const welcomeTemplate = await prisma.whatsAppTemplate.findFirst({
          where: {
            dealershipId,
            type: "welcome",
          },
        });

        if (welcomeTemplate) {
          try {
            await whatsappClient.sendTemplate({
              contactNumber: data.whatsappNumber,
              templateName: welcomeTemplate.templateName,
              templateId: welcomeTemplate.templateId,
              templateLanguage: welcomeTemplate.language,
              parameters: [name],
            });
            messageStatus = "sent";
          } catch (error: unknown) {
            console.error("Failed to send welcome message (fallback):", error);
            messageStatus = "failed";
            messageError = (error as Error).message || "Failed to send message";
          }
        }
      }
    }

    return {
      success: true,
      visitor: {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
      },
      session: {
        id: session.id,
        status: session.status,
      },
      message: {
        status: messageStatus,
        error: messageError,
      },
    };
  }

  /**
   * Get visitors with pagination and deduplication
   */
  async getVisitors(
    dealershipId: string,
    limit?: number,
    skip?: number,
  ): Promise<{
    visitors: VisitorWithRelations[];
    hasMore: boolean;
    total: number;
    skip: number;
    limit: number;
  }> {
    const take = limit || PAGINATION.DEFAULT_LIMIT;
    const offset = skip || PAGINATION.DEFAULT_SKIP;

    const { visitors, total } =
      await this.repository.findByDealershipWithDeduplication(dealershipId, {
        limit: take,
        skip: offset,
      });

    const hasMore = offset + take < total;

    return {
      visitors,
      hasMore,
      total,
      skip: offset,
      limit: take,
    };
  }

  /**
   * Lookup visitor by phone number
   */
  async lookupByPhone(
    phoneNumber: string,
    dealershipId: string,
  ): Promise<VisitorLookupResponse> {
    const visitor = await this.repository.findByPhoneAndDealership(
      phoneNumber,
      dealershipId,
    );

    if (!visitor) {
      return { visitor: null, found: false };
    }

    return {
      visitor: {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        whatsappNumber: visitor.whatsappNumber,
        email: visitor.email,
        address: visitor.address,
        sessionCount: visitor.sessions?.length || 0,
        interests: visitor.interests.map((i) => ({
          modelId: i.model.id,
          modelName: i.model.name,
          categoryName: i.model.category.name,
        })),
      },
      found: true,
    };
  }

  /**
   * Create session for existing visitor
   */
  async createSession(
    data: CreateSessionDto,
    dealershipId: string,
  ): Promise<CreateSessionResponse> {
    const visitor = await this.repository.findByIdAndDealership(
      data.visitorId,
      dealershipId,
    );

    if (!visitor) {
      throw new Error("Visitor not found");
    }

    const sessionCount = visitor.sessions?.length || 0;
    const visitNumber = sessionCount + 1;

    // Create session
    const session = await prisma.visitorSession.create({
      data: {
        reason: data.reason,
        visitorId: visitor.id,
        status: "intake",
      },
    });

    // Handle model interests
    if (data.modelIds && data.modelIds.length > 0) {
      const existingInterests = await prisma.visitorInterest.findMany({
        where: {
          visitorId: visitor.id,
        },
        select: {
          modelId: true,
          variantId: true,
        },
      });

      const existingInterestsSet = new Set(
        existingInterests.map((ei) => `${ei.modelId}:${ei.variantId || ""}`),
      );

      type InterestToCreate = {
        visitorId: string;
        modelId: string;
        variantId: string | null;
        sessionId: string;
      };

      const interestsToCreate: InterestToCreate[] = data.modelIds
        .map(
          (
            item: string | { modelId: string; variantId?: string },
          ): InterestToCreate | null => {
            const modelId = typeof item === "string" ? item : item.modelId;
            const variantId =
              typeof item === "object" ? item.variantId : undefined;
            const key = `${modelId}:${variantId || ""}`;

            if (!existingInterestsSet.has(key)) {
              return {
                visitorId: visitor.id,
                modelId,
                variantId: variantId || null,
                sessionId: session.id,
              };
            }
            return null;
          },
        )
        .filter(
          (item: InterestToCreate | null): item is InterestToCreate =>
            item !== null,
        );

      if (interestsToCreate.length > 0) {
        await prisma.visitorInterest.createMany({
          data: interestsToCreate,
        });
      }

      // Update existing interests to link to this session
      const selectedItems = data.modelIds.filter(
        (item: string | { modelId: string; variantId?: string }) => {
          const modelId = typeof item === "string" ? item : item.modelId;
          const variantId =
            typeof item === "object" ? item.variantId : undefined;
          const key = `${modelId}:${variantId || ""}`;
          return existingInterestsSet.has(key);
        },
      );

      if (selectedItems.length > 0) {
        for (const item of selectedItems) {
          const modelId = typeof item === "string" ? item : item.modelId;
          const variantId =
            typeof item === "object" ? item.variantId : undefined;

          await prisma.visitorInterest.updateMany({
            where: {
              visitorId: visitor.id,
              modelId,
              variantId: variantId || null,
              sessionId: null,
            },
            data: {
              sessionId: session.id,
            },
          });
        }
      }
    }

    // Send WhatsApp message
    const returnVisitTemplate = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId,
        type: "return_visit",
      },
    });

    const welcomeTemplate = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId,
        type: "welcome",
      },
    });

    const templateToUse = returnVisitTemplate || welcomeTemplate;

    let messageStatus: "sent" | "failed" | "not_sent" | "not_configured" =
      "not_sent";
    let messageError: string | null = null;

    if (templateToUse) {
      try {
        const visitLabel =
          visitNumber === 1
            ? "1st"
            : visitNumber === 2
              ? "2nd"
              : visitNumber === 3
                ? "3rd"
                : `${visitNumber}th`;

        const parameters =
          templateToUse.type === "return_visit"
            ? [visitor.firstName, visitLabel]
            : [visitor.firstName, new Date().toLocaleDateString()];

        await whatsappClient.sendTemplate({
          contactNumber: visitor.whatsappNumber,
          templateName: templateToUse.templateName,
          templateId: templateToUse.templateId,
          templateLanguage: templateToUse.language,
          parameters,
        });
        messageStatus = "sent";
      } catch (error: unknown) {
        console.error("Failed to send return visit message:", error);
        messageStatus = "failed";
        messageError = (error as Error).message || "Failed to send message";
      }
    }

    return {
      success: true,
      session: {
        id: session.id,
        status: session.status,
        visitNumber,
      },
      visitor: {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
      },
      message: {
        status: messageStatus,
        error: messageError,
      },
    };
  }
}
