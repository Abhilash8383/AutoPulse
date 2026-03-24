import { Router } from "express";
import { DigitalEnquiryController } from "../controllers/digital-enquiry.controller";
import { authenticate, asyncHandler } from "../middleware/auth";
import { checkPermission } from "../middleware/permissions";
import { PERMISSIONS } from "../config/permissions";

const router: Router = Router();
const controller = new DigitalEnquiryController();

// Create digital enquiry
router.post("/", authenticate, checkPermission(PERMISSIONS.DIGITAL_ENQUIRY), asyncHandler(controller.create));

// Get digital enquiries
router.get("/", authenticate, checkPermission(PERMISSIONS.DIGITAL_ENQUIRY), asyncHandler(controller.getAll));

// Update lead scope
router.patch("/:id", authenticate, checkPermission(PERMISSIONS.DIGITAL_ENQUIRY), asyncHandler(controller.updateLeadScope));

// Update digital enquiry intake details
router.patch(
  "/:id/details",
  authenticate,
  checkPermission(PERMISSIONS.DIGITAL_ENQUIRY),
  asyncHandler(controller.updateDetails),
);

// Bulk upload
router.post("/bulk", authenticate, checkPermission(PERMISSIONS.DIGITAL_ENQUIRY), asyncHandler(controller.bulkUpload));

export default router;
