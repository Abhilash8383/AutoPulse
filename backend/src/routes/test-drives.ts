import { Router, Request, Response } from "express";
import prisma from "../lib/db";
import { whatsappClient } from "../lib/whatsapp";
import { authenticate, asyncHandler } from "../middleware/auth";
import { getVisitorPhone } from "../utils/contact-resolver";

const router: Router = Router();

// Create test drive
router.post(
  "/",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { sessionId, modelId, variantId } = req.body;

    if (!sessionId || !modelId) {
      res.status(400).json({ error: "Session ID and model ID are required" });
      return;
    }

    // Verify session belongs to user's dealership
    const session = await prisma.visitorSession.findFirst({
      where: {
        id: sessionId,
        visitor: {
          dealershipId: req.user.dealershipId,
        },
      },
      include: {
        visitor: { include: { contact: true } },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Create test drive record
    const testDrive = await prisma.testDrive.create({
      data: {
        sessionId,
        modelId,
        variantId: variantId || null,
      },
      include: {
        model: true,
        variant: true,
      },
    });

    // Update session status
    await prisma.visitorSession.update({
      where: { id: sessionId },
      data: { status: "test_drive" },
    });

    // Send test drive message
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId: req.user.dealershipId,
        type: "test_drive",
      },
    });

    let messageStatus = "not_sent";
    let messageError = null;

    const visitorPhone = getVisitorPhone(session.visitor);
    if (template && visitorPhone) {
      try {
        const dealership = await prisma.dealership.findUnique({
          where: { id: req.user.dealershipId },
          select: { showroomNumber: true },
        });
        const showroomNumber = dealership?.showroomNumber || "999999999";

        await whatsappClient.sendTemplate({
          contactNumber: visitorPhone,
          templateName: template.templateName,
          templateId: template.templateId,
          templateLanguage: template.language,
          parameters: [showroomNumber],
        });
        messageStatus = "sent";
      } catch (error: unknown) {
        console.error("Failed to send test drive message:", error);
        messageStatus = "failed";
        messageError = (error as Error).message || "Failed to send test drive message";
      }
    }

    res.json({
      success: true,
      testDrive: {
        id: testDrive.id,
      },
      message: {
        status: messageStatus,
        error: messageError,
      },
    });
  })
);

// Get test drives
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const testDrives = await prisma.testDrive.findMany({
      where: {
        session: {
          visitor: {
            dealershipId: req.user.dealershipId,
          },
        },
      },
      include: {
        model: {
          include: {
            category: true,
          },
        },
        session: {
          include: {
            visitor: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ testDrives });
  })
);

export default router;

