import { Request, Response } from "express";
import { ContactRepository } from "../repositories/contact.repository";
import { PAGINATION } from "../config/constants";

export class ContactController {
  private repository: ContactRepository;

  constructor() {
    this.repository = new ContactRepository();
  }

  /**
   * List contacts (CRM-ready).
   * - Org-level (super_admin/admin with organizationId): all contacts for that organization.
   * - Dealership-level: contacts for that dealership only.
   * GET /api/contacts?limit=&skip=&search=
   */
  list = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user?.organizationId;
    const dealershipId = req.user?.dealershipId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!organizationId && !dealershipId) {
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
      const { contacts, total } =
        isOrgAdmin && organizationId
          ? await this.repository.findByOrganization(organizationId, {
              limit,
              skip,
              search,
            })
          : await this.repository.findByDealership(dealershipId!, {
              limit,
              skip,
              search,
            });

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
   * Org admins can view any contact in their org; others by dealership.
   * GET /api/contacts/:id
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user?.organizationId;
    const dealershipId = req.user?.dealershipId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!organizationId && !dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const id = req.params.id as string;
    try {
      const contact =
        isOrgAdmin && organizationId
          ? await this.repository.findByIdAndOrganization(id, organizationId)
          : await this.repository.findByIdAndDealership(id, dealershipId!);

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
