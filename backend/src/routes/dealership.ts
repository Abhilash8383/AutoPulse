import { Router, Request, Response } from "express";
import prisma from "../lib/db";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";

const router: Router = Router();

// Get dealership (no permission check - users need to see their dealership)
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const dealership = await prisma.dealership.findUnique({
      where: { id: req.user.dealershipId },
      select: {
        id: true,
        name: true,
        location: true,
        showroomNumber: true,
      },
    });

    if (!dealership) {
      res.status(404).json({ error: "Dealership not found" });
      return;
    }

    res.json({ dealership });
  })
);

// Update dealership
router.put(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.SETTINGS_PROFILE),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { name, location, showroomNumber } = req.body;

    if (!name || !location) {
      res.status(400).json({ error: "Name and location are required" });
      return;
    }

    const dealership = await prisma.dealership.update({
      where: { id: req.user.dealershipId },
      data: {
        name,
        location,
        showroomNumber: showroomNumber || null,
      },
      select: {
        id: true,
        name: true,
        location: true,
        showroomNumber: true,
      },
    });

    res.json({ success: true, dealership });
  })
);

// Get dealership users for assignment dropdown (id + email)
router.get(
  "/users",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const users = await prisma.user.findMany({
      where: { dealershipId: req.user.dealershipId, isActive: true },
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    });
    res.json({ users });
  }),
);

export default router;

