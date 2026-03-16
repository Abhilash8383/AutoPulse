import { Request, Response } from "express";
import { ContactRepository } from "../repositories/contact.repository";
import { PAGINATION } from "../config/constants";

export class ContactController {
  private repository: ContactRepository;

  constructor() {
    this.repository = new ContactRepository();
  }

  /**
   * List contacts for the current dealership (CRM-ready).
   * GET /api/contacts?limit=&skip=&search=
   */
  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user?.dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
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
    const search = (req.query.search as string) || undefined;

    try {
      const { contacts, total } = await this.repository.findByDealership(
        req.user.dealershipId,
        { limit, skip, search },
      );
      res.json({
        contacts,
        total,
        limit,
        skip,
        hasMore: skip + contacts.length < total,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Get a single contact by ID (tenant-scoped).
   * GET /api/contacts/:id
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    if (!req.user?.dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const id = req.params.id as string;
    try {
      const contact = await this.repository.findByIdAndDealership(
        id,
        req.user.dealershipId,
      );
      if (!contact) {
        res.status(404).json({ error: "Contact not found" });
        return;
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };
}
