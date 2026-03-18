import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import authRoutes from "./auth";
import categoriesRoutes from "./categories";
import modelsRoutes from "./models";
import variantsRoutes from "./variants";
import dealershipRoutes from "./dealership";
import leadSourcesRoutes from "./lead-sources";
import templatesRoutes from "./templates";
import visitorsRoutes from "./visitors.routes";
import sessionsRoutes from "./sessions";
import testDrivesRoutes from "./test-drives";
import digitalEnquiryRoutes from "./digital-enquiry.routes";
import fieldInquiryRoutes from "./field-inquiry.routes";
import deliveryTicketsRoutes from "./delivery-tickets";
import statisticsRoutes from "./statistics";
import phoneLookupRoutes from "./phone-lookup";
import cronRoutes from "./cron";
import healthRoutes from "./health";
import debugRoutes from "./debug";
import bulkUploadJobsRoutes from "./bulk-upload-jobs";
import exportRoutes from "./export.routes";
import organizationsRoutes from "./organizations";
import contactsRoutes from "./contacts";
import crmLeadsRoutes from "./crm-leads";
import crmNotesRoutes from "./crm-notes";
import crmTimelineRoutes from "./crm-timeline";

const router: ExpressRouter = Router();

// Ensure contacts route is mounted (GET /api/contacts)
router.use("/contacts", contactsRoutes);
router.use("/crm/leads", crmLeadsRoutes);
router.use("/crm/notes", crmNotesRoutes);
router.use("/crm/timeline", crmTimelineRoutes);

// Auth routes
router.use("/auth", authRoutes);

// Organization routes (3-tier multi-tenant)
router.use("/organizations", organizationsRoutes);

// Data routes
router.use("/categories", categoriesRoutes);
router.use("/models", modelsRoutes);
router.use("/variants", variantsRoutes);
router.use("/dealership", dealershipRoutes);
router.use("/lead-sources", leadSourcesRoutes);
router.use("/templates", templatesRoutes);

// Visitor & Session routes
router.use("/visitors", visitorsRoutes);
router.use("/sessions", sessionsRoutes);
router.use("/test-drives", testDrivesRoutes);

// Business routes
router.use("/digital-enquiry", digitalEnquiryRoutes);
router.use("/field-inquiry", fieldInquiryRoutes);
router.use("/delivery-tickets", deliveryTicketsRoutes);
router.use("/bulk-upload-jobs", bulkUploadJobsRoutes);
router.use("/export", exportRoutes);

// System routes
router.use("/statistics", statisticsRoutes);
router.use("/phone-lookup", phoneLookupRoutes);
router.use("/cron", cronRoutes);
router.use("/health", healthRoutes);
router.use("/debug", debugRoutes);

export default router;
