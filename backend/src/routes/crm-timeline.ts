import { Router } from "express";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";
import { CrmTimelineController } from "../controllers/crm-timeline.controller";

const router: Router = Router();
const controller = new CrmTimelineController();

router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.list),
);

export default router;

