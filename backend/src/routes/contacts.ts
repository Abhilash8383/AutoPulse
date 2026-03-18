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
