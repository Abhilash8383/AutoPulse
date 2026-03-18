import { Router } from "express";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";
import { CrmNotesController } from "../controllers/crm-notes.controller";

const router: Router = Router();
const controller = new CrmNotesController();

router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.list),
);

router.post(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.create),
);

export default router;

