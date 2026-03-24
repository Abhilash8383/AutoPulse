import { Router } from "express";
import { FieldInquiryController } from "../controllers/field-inquiry.controller";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";

const router: Router = Router();
const controller = new FieldInquiryController();

// Create field inquiry
router.post("/", authenticate, checkPermission(PERMISSIONS.FIELD_INQUIRY), asyncHandler(controller.create));

// Get field inquiries
router.get("/", authenticate, checkPermission(PERMISSIONS.FIELD_INQUIRY), asyncHandler(controller.getAll));

// Update lead scope
router.patch(
  "/:id/details",
  authenticate,
  checkPermission(PERMISSIONS.FIELD_INQUIRY),
  asyncHandler(controller.updateDetails),
);

// Update lead scope
router.patch(
  "/:id",
  authenticate,
  checkPermission(PERMISSIONS.FIELD_INQUIRY),
  asyncHandler(controller.updateLeadScope),
);

// Bulk upload
router.post("/bulk", authenticate, checkPermission(PERMISSIONS.FIELD_INQUIRY), asyncHandler(controller.bulkUpload));

export default router;
