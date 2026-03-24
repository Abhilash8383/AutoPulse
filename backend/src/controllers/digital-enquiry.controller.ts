import { Request, Response } from "express";
import { DigitalEnquiryService } from "../services/digital-enquiry.service";
import { CreateDigitalEnquiryDto } from "../dto/request/create-digital-enquiry.dto";
import { UpdateDigitalEnquiryDetailsDto } from "../dto/request/update-digital-enquiry-details.dto";
import { UpdateLeadScopeDto } from "../dto/request/update-lead-scope.dto";
import { PAGINATION } from "../config/constants";

export class DigitalEnquiryController {
  private service: DigitalEnquiryService;

  constructor() {
    this.service = new DigitalEnquiryService();
  }

  /**
   * Create a digital enquiry
   * POST /api/digital-enquiry
   */
  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const data: CreateDigitalEnquiryDto = req.body;

    // Validate required fields
    if (
      !data.firstName ||
      !data.lastName ||
      !data.whatsappNumber ||
      !data.reason
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const result = await this.service.createEnquiry(
        data,
        req.user.dealershipId,
      );
      res.json(result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("Failed to create WhatsApp contact")) {
        res.status(500).json({
          error: "Failed to create WhatsApp contact",
          details: errorMessage,
        });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }
  };

  /**
   * Get digital enquiries
   * GET /api/digital-enquiry
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const limit = parseInt(
      (req.query.limit as string) || String(PAGINATION.DEFAULT_LIMIT),
      10,
    );
    const skip = parseInt(
      (req.query.skip as string) || String(PAGINATION.DEFAULT_SKIP),
      10,
    );

    try {
      const result = await this.service.getEnquiries(
        req.user.dealershipId,
        limit,
        skip,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Update lead scope
   * PATCH /api/digital-enquiry/:id
   */
  updateLeadScope = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const data: UpdateLeadScopeDto = req.body;

    try {
      const result = await this.service.updateLeadScope(
        id,
        data,
        req.user.dealershipId,
      );
      res.json(result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === "Enquiry not found") {
        res.status(404).json({ error: errorMessage });
      } else if (errorMessage.includes("Invalid leadScope")) {
        res.status(400).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }
  };

  /**
   * Update full digital enquiry intake details
   * PATCH /api/digital-enquiry/:id/details
   */
  updateDetails = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const data: UpdateDigitalEnquiryDetailsDto = req.body;

    try {
      const result = await this.service.updateDetails(
        id,
        data,
        req.user.dealershipId,
      );
      res.json(result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === "Enquiry not found") {
        res.status(404).json({ error: errorMessage });
      } else if (
        errorMessage.includes("Invalid") ||
        errorMessage.includes("Invalid leadScope") ||
        errorMessage.includes("Interested") ||
        errorMessage.includes("must be")
      ) {
        res.status(400).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }
  };

  /**
   * Bulk upload digital enquiries (synchronous, same as Field Inquiry).
   * POST /api/digital-enquiry/bulk
   * Processes immediately, sends WhatsApp templates per row, returns results.
   */
  bulkUpload = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: "No data provided or invalid format" });
      return;
    }

    try {
      const result = await this.service.bulkUpload(
        { rows },
        req.user.dealershipId,
      );
      res.status(200).json({
        success: result.success,
        summary: result.summary,
        results: result.results,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("❌ Bulk upload error:", errorMessage, error);
      if (errorMessage.includes("Missing required columns")) {
        res.status(400).json({ error: errorMessage });
      } else {
        res
          .status(500)
          .json({ error: "Failed to process upload", details: errorMessage });
      }
    }
  };
}
