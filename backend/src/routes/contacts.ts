import { Router } from "express";
import { ContactController } from "../controllers/contact.controller";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";

const router: Router = Router();
const controller = new ContactController();

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
// Unified activity feed across Walkins/Digital/Field/Delivery.
// IMPORTANT: must be defined BEFORE "/:id" so Express doesn't treat "activity"
// as the ":id" param.
router.get(
  "/activity",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.activityFeed),
);
router.get(
  "/:id(c[a-zA-Z0-9]+)",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.getById),
);
router.get(
  "/:id(c[a-zA-Z0-9]+)/activity",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.activity),
);
router.patch(
  "/:id(c[a-zA-Z0-9]+)",
  authenticate,
  checkPermission(PERMISSIONS.DAILY_WALKINS_VISITORS),
  asyncHandler(controller.update),
);

export default router;
