import { Router } from "express";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";
import { CrmLeadsController } from "../controllers/crm-leads.controller";

const router: Router = Router();
const controller = new CrmLeadsController();

router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.list),
);

router.get(
  "/:id",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.getById),
);

router.patch(
  "/:id",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.update),
);

export default router;

