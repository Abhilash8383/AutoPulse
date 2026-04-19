import { Router } from "express";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";
import { CrmOverviewController } from "../controllers/crm-overview.controller";

const router: Router = Router();
const controller = new CrmOverviewController();

router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.get),
);

export default router;
