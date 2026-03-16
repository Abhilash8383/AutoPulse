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
    const dealershipId = req.user?.dealershipId;
    const organizationId = req.user?.organizationId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!dealershipId && !(isOrgAdmin && organizationId)) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (dealershipId) {
      const sources = await prisma.leadSource.findMany({
        where: { dealershipId },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      });
      res.json({ leadSources: sources });
      return;
    }

    const dealerships = await prisma.dealership.findMany({
      where: { organizationId: organizationId! },
      select: { id: true },
    });
    const ids = dealerships.map((d) => d.id);
    if (ids.length === 0) {
      res.json({ leadSources: [] });
      return;
    }
    const sources = await prisma.leadSource.findMany({
      where: { dealershipId: { in: ids } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    res.json({ leadSources: sources });
  }),
);

export default router;
