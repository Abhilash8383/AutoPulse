import { Router, Request, Response } from "express";
import prisma from "../lib/db";
import { whatsappClient } from "../lib/whatsapp";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";
import { getVisitorPhone } from "../utils/contact-resolver";

const router: Router = Router();

// Get sessions
router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_SESSIONS),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const visitorId = req.query.visitorId as string | undefined;
    const limit = parseInt((req.query.limit as string) || "30", 10);
    const skip = parseInt((req.query.skip as string) || "0", 10);

    // Get total count
    const totalCount = await prisma.visitorSession.count({
      where: {
        visitor: {
          dealershipId: req.user.dealershipId,
          ...(visitorId ? { id: visitorId } : {}),
        },
      },
    });

    const sessions = await prisma.visitorSession.findMany({
      where: {
        visitor: {
          dealershipId: req.user.dealershipId,
          ...(visitorId ? { id: visitorId } : {}),
        },
      },
      include: {
        visitor: true,
        testDrives: {
          include: {
            model: {
              include: {
                category: true,
              },
            },
          },
        },
        visitorInterests: {
          where: {
            sessionId: {
              not: null,
            },
          },
          include: {
            model: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
    });

    const hasMore = skip + limit < totalCount;

    res.json({
      sessions,
      hasMore,
      total: totalCount,
      skip,
      limit,
    });
  }),
);

// Exit session
router.post(
  "/exit",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_SESSIONS),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { sessionId, feedback } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "Session ID is required" });
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

    // Update session status and feedback
    const updatedSession = await prisma.visitorSession.update({
      where: { id: sessionId },
      data: {
        status: "exited",
        feedback: feedback || null,
      },
      include: {
        visitor: { include: { contact: true } },
        testDrives: {
          include: {
            model: {
              include: {
                category: true,
              },
            },
          },
        },
        visitorInterests: {
          where: {
            sessionId: {
              not: null,
            },
          },
          include: {
            model: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Send exit message
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        dealershipId: req.user.dealershipId,
        type: "exit",
      },
    });

    let messageStatus = "not_sent";
    let messageError = null;

    const visitorPhone = getVisitorPhone(session.visitor);
    if (template && visitorPhone) {
      try {
        await whatsappClient.sendTemplate({
          contactNumber: visitorPhone,
          templateName: template.templateName,
          templateId: template.templateId,
          templateLanguage: template.language,
          parameters: [],
        });
        messageStatus = "sent";
      } catch (error: unknown) {
        console.error("Failed to send exit message:", error);
        messageStatus = "failed";
        messageError =
          (error as Error).message || "Failed to send exit message";
      }
    }

    res.json({
      success: true,
      session: updatedSession,
      message: {
        status: messageStatus,
        error: messageError,
      },
    });
  }),
);

export default router;
