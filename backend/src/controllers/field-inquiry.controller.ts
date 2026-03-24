import { Request, Response } from "express";
import { FieldInquiryService } from "../services/field-inquiry.service";
import { CreateFieldInquiryDto } from "../dto/request/create-field-inquiry.dto";
import { UpdateFieldInquiryDetailsDto } from "../dto/request/update-field-inquiry-details.dto";
import { UpdateLeadScopeDto } from "../dto/request/update-lead-scope.dto";
import { PAGINATION } from "../config/constants";

export class FieldInquiryController {
  private service: FieldInquiryService;

  constructor() {
    this.service = new FieldInquiryService();
  }

  /**
   * Create a field inquiry
   * POST /api/field-inquiry
   */
  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const data: CreateFieldInquiryDto = req.body;

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.whatsappNumber || !data.reason) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const result = await this.service.createInquiry(data, req.user.dealershipId);
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
   * Get field inquiries
   * GET /api/field-inquiry
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const limit = parseInt((req.query.limit as string) || String(PAGINATION.DEFAULT_LIMIT), 10);
    const skip = parseInt((req.query.skip as string) || String(PAGINATION.DEFAULT_SKIP), 10);

    try {
      const result = await this.service.getInquiries(
        req.user.dealershipId,
        limit,
        skip
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Update lead scope
   * PATCH /api/field-inquiry/:id
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
        req.user.dealershipId
      );
      res.json(result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === "Inquiry not found") {
        res.status(404).json({ error: errorMessage });
      } else if (errorMessage.includes("Invalid leadScope")) {
        res.status(400).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }
  };

  /**
   * Update full field inquiry intake details
   * PATCH /api/field-inquiry/:id/details
   */
  updateDetails = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const data: UpdateFieldInquiryDetailsDto = req.body;

    try {
      const result = await this.service.updateDetails(
        id,
        data,
        req.user.dealershipId,
      );
      res.json(result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === "Inquiry not found") {
        res.status(404).json({ error: errorMessage });
      } else if (
        errorMessage.includes("Invalid") ||
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
   * Bulk upload field inquiries
   * POST /api/field-inquiry/bulk
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
      const result = await this.service.bulkUpload({ rows }, req.user.dealershipId);
      res.json(result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (
        errorMessage.includes("Missing required columns") ||
        errorMessage.includes("No data provided")
      ) {
        res.status(400).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }
  };
}
