import { Router, Request, Response } from "express";
import prisma from "../lib/db";
import { whatsappClient } from "../lib/whatsapp";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";
import { ContactRepository } from "../repositories/contact.repository";

const router: Router = Router();
const contactRepository = new ContactRepository();

// Create delivery ticket
router.post(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DELIVERY_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const {
      firstName,
      lastName,
      whatsappNumber,
      email,
      address,
      description,
      deliveryDate,
      modelId,
      variantId,
      scheduleOption,
    } = req.body;

    if (!firstName || !lastName || !whatsappNumber || !deliveryDate || !modelId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const deliveryDateObj = new Date(deliveryDate);
    if (isNaN(deliveryDateObj.getTime())) {
      res.status(400).json({ error: "Invalid delivery date" });
      return;
    }

    const ticket = await prisma.deliveryTicket.create({
      data: {
        firstName,
        lastName,
        whatsappNumber,
        email: email || null,
        address: address || null,
        description: description || null,
        deliveryDate: deliveryDateObj,
        whatsappContactId: null,
        dealershipId: req.user.dealershipId,
        contactId: (await contactRepository.findOrCreate(req.user.dealershipId, {
          firstName,
          lastName,
          whatsappNumber,
          email: email || undefined,
          address: address || undefined,
        })).id,
        modelId,
        variantId: variantId || null,
        messageSent: scheduleOption === "now" || false,
      },
      include: {
        model: {
          include: {
            category: true,
          },
        },
      },
    });

    let scheduledMessageId = null;
    let messageStatus = "not_sent";
    let messageError = null;

    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId: req.user.dealershipId,
        type: "delivery_reminder",
        OR: [
          { section: "delivery_update" },
          { section: "global" },
          { section: null },
        ],
      },
      orderBy: [{ section: "asc" }],
    });

    if (!template || !template.templateId || !template.templateName) {
      // Template not configured or missing
    } else {
      if (scheduleOption === "now") {
        try {
          const modelName = ticket.model
            ? `${ticket.model.category.name} - ${ticket.model.name}`
            : "N/A";

          const deliveryDateFormatted = deliveryDateObj.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          await whatsappClient.sendTemplate({
            contactNumber: whatsappNumber,
            templateName: template.templateName,
            templateId: template.templateId,
            templateLanguage: template.language,
            parameters: [modelName, deliveryDateFormatted],
          });
          messageStatus = "sent";

          await prisma.deliveryTicket.update({
            where: { id: ticket.id },
            data: { messageSent: true },
          });
        } catch (error: unknown) {
          console.error("Failed to send delivery message:", error);
          messageStatus = "failed";
          messageError = (error as Error).message || "Failed to send message";
        }
      } else {
        const daysBefore = scheduleOption === "d3" ? 3 : scheduleOption === "d2" ? 2 : 1;
        const scheduledFor = new Date(deliveryDateObj);
        scheduledFor.setDate(scheduledFor.getDate() - daysBefore);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDateNormalized = new Date(scheduledFor);
        scheduledDateNormalized.setHours(0, 0, 0, 0);

        if (scheduledDateNormalized > today) {
          const scheduledMessage = await prisma.scheduledMessage.create({
            data: {
              deliveryTicketId: ticket.id,
              scheduledFor,
              status: "pending",
            },
          });
          scheduledMessageId = scheduledMessage.id;
        } else {
          try {
            const modelName = ticket.model
              ? `${ticket.model.category.name} - ${ticket.model.name}`
              : "N/A";

            const daysBeforeStr = String(daysBefore);

            await whatsappClient.sendTemplate({
              contactNumber: whatsappNumber,
              templateName: template.templateName,
              templateId: template.templateId,
              templateLanguage: template.language,
              parameters: [modelName, daysBeforeStr],
            });
            messageStatus = "sent";

            await prisma.deliveryTicket.update({
              where: { id: ticket.id },
              data: { messageSent: true },
            });
          } catch (error: unknown) {
            console.error("Failed to send delivery message:", error);
            messageStatus = "failed";
            messageError = (error as Error).message || "Failed to send message";
          }
        }
      }
    }

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        firstName: ticket.firstName,
        lastName: ticket.lastName,
      },
      scheduledMessageId,
      message: {
        status: messageStatus,
        error: messageError,
      },
    });
  })
);

// Get delivery tickets
router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DELIVERY_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const limit = parseInt((req.query.limit as string) || "50", 10);
    const skip = parseInt((req.query.skip as string) || "0", 10);

    const total = await prisma.deliveryTicket.count({
      where: {
        dealershipId: req.user.dealershipId,
      },
    });

    const tickets = await prisma.deliveryTicket.findMany({
      where: {
        dealershipId: req.user.dealershipId,
      },
      include: {
        model: {
          include: {
            category: true,
          },
        },
        scheduledMessages: {
          where: {
            status: "pending",
          },
          orderBy: {
            scheduledFor: "asc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
    });

    const hasMore = skip + tickets.length < total;

    res.json({
      tickets,
      total,
      hasMore,
    });
  })
);

// Update delivery ticket details
router.patch(
  "/:id/details",
  authenticate,
  checkPermission(PERMISSIONS.DELIVERY_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id: ticketId } = req.params;
    const {
      modelId,
      variantId,
      deliveryDate,
      status,
      description,
    } = req.body as {
      modelId?: string;
      variantId?: string | null;
      deliveryDate?: string;
      status?: string;
      description?: string | null;
    };

    const ticket = await prisma.deliveryTicket.findFirst({
      where: { id: ticketId, dealershipId: req.user.dealershipId },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const effectiveModelId = modelId ?? ticket.modelId;

    if (modelId !== undefined) {
      const model = await prisma.vehicleModel.findFirst({
        where: {
          id: modelId,
          category: { dealershipId: req.user.dealershipId },
        },
        select: { id: true },
      });

      if (!model) {
        res.status(400).json({ error: "Invalid modelId for this dealership" });
        return;
      }
    }

    if (variantId !== undefined) {
      if (variantId !== null) {
        const variant = await prisma.vehicleVariant.findFirst({
          where: { id: variantId, modelId: effectiveModelId },
          select: { id: true },
        });
        if (!variant) {
          res
            .status(400)
            .json({ error: "Invalid variantId for the selected model" });
          return;
        }
      }
    }

    const updateData: any = {};
    if (modelId !== undefined) updateData.modelId = modelId;
    if (variantId !== undefined) updateData.variantId = variantId;
    if (deliveryDate !== undefined) {
      const deliveryDateObj = new Date(deliveryDate);
      if (isNaN(deliveryDateObj.getTime())) {
        res.status(400).json({ error: "Invalid deliveryDate" });
        return;
      }
      updateData.deliveryDate = deliveryDateObj;
    }
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;

    const updatedTicket = await prisma.deliveryTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        model: { include: { category: true } },
        variant: true,
      },
    });

    res.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        firstName: updatedTicket.firstName,
        lastName: updatedTicket.lastName,
      },
    });
  })
);

// Send now
router.post(
  "/:id/send-now",
  authenticate,
  checkPermission(PERMISSIONS.DELIVERY_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id: ticketId } = req.params;

    const ticket = await prisma.deliveryTicket.findFirst({
      where: {
        id: ticketId,
        dealershipId: req.user.dealershipId,
      },
      include: {
        model: {
          include: {
            category: true,
          },
        },
        scheduledMessages: {
          where: {
            status: "pending",
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId: req.user.dealershipId,
        type: "delivery_reminder",
        OR: [
          { section: "delivery_update" },
          { section: "global" },
          { section: null },
        ],
      },
      orderBy: [{ section: "asc" }],
    });

    if (!template) {
      res.status(400).json({
        error: "Delivery template not configured. Please add a Delivery Reminder template in Global Settings.",
      });
      return;
    }

    if (!template.templateId || !template.templateName) {
      res.status(400).json({
        error: "Delivery template is not fully configured. Please fill in Template ID and Template Name in Global Settings.",
      });
      return;
    }

    if (ticket.scheduledMessages.length > 0) {
      await prisma.scheduledMessage.updateMany({
        where: {
          id: { in: ticket.scheduledMessages.map((m) => m.id) },
          status: "pending",
        },
        data: {
          status: "failed",
        },
      });
    }

    let messageStatus = "sent";
    let messageError = null;

    try {
      const modelName = ticket.model
        ? `${ticket.model.category.name} - ${ticket.model.name}`
        : "N/A";

      const deliveryDateFormatted = new Date(ticket.deliveryDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      await whatsappClient.sendTemplate({
        contactNumber: ticket.whatsappNumber,
        templateName: template.templateName,
        templateId: template.templateId,
        templateLanguage: template.language,
        parameters: [modelName, deliveryDateFormatted],
      });

      await prisma.deliveryTicket.update({
        where: { id: ticket.id },
        data: { messageSent: true },
      });
    } catch (error: unknown) {
      console.error("Failed to send delivery message:", error);
      messageStatus = "failed";
      messageError = (error as Error).message || "Failed to send message";
    }

    res.json({
      success: true,
      message: {
        status: messageStatus,
        error: messageError,
      },
    });
  })
);

// Send completion
router.post(
  "/:id/send-completion",
  authenticate,
  checkPermission(PERMISSIONS.DELIVERY_UPDATE),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id: ticketId } = req.params;

    const ticket = await prisma.deliveryTicket.findFirst({
      where: {
        id: ticketId,
        dealershipId: req.user.dealershipId,
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId: req.user.dealershipId,
        type: "delivery_completion",
        section: "delivery_update",
      },
    });

    if (!template) {
      res.status(400).json({
        error: "Delivery Completion template not configured. Please add a Delivery Completion template in Global Settings.",
      });
      return;
    }

    if (!template.templateId || !template.templateName) {
      res.status(400).json({
        error: "Delivery Completion template is not fully configured. Please fill in Template ID and Template Name in Global Settings.",
      });
      return;
    }

    if (ticket.completionSent || ticket.status === "closed") {
      res.status(400).json({
        error: "Completion message has already been sent for this ticket. Ticket is closed.",
      });
      return;
    }

    let messageStatus = "sent";
    let messageError = null;

    try {
      await whatsappClient.sendTemplate({
        contactNumber: ticket.whatsappNumber,
        templateName: template.templateName,
        templateId: template.templateId,
        templateLanguage: template.language,
        parameters: [],
      });

      await prisma.deliveryTicket.update({
        where: { id: ticket.id },
        data: {
          completionSent: true,
          messageSent: true,
          status: "closed",
        },
      });
    } catch (error: unknown) {
      console.error("Failed to send delivery completion message:", error);
      messageStatus = "failed";
      messageError = (error as Error).message || "Failed to send message";
    }

    res.json({
      success: messageStatus === "sent",
      message: {
        status: messageStatus,
        error: messageError,
      },
    });
  })
);

export default router;
