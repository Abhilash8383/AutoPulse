import { Router, Request, Response } from "express";
import prisma from "../lib/db";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";

const router: Router = Router();

router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.SETTINGS_LEAD_SOURCES),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const sources = await prisma.leadSource.findMany({
      where: { dealershipId: req.user.dealershipId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    res.json(sources);
  }),
);

export default router;
