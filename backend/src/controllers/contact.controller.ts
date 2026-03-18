import { Request, Response } from "express";
import { ContactRepository } from "../repositories/contact.repository";
import { PAGINATION } from "../config/constants";
import { CrmLeadRepository } from "../repositories/crm-lead.repository";
import prisma from "../lib/db";
import { normalizePhoneNumber } from "../utils/phone-formatter";

export class ContactController {
  private repository: ContactRepository;
  private crmLeadRepository: CrmLeadRepository;

  constructor() {
    this.repository = new ContactRepository();
    this.crmLeadRepository = new CrmLeadRepository();
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

  /**
   * Create a contact (dealership CRM) and auto-create an import lead.
   * POST /api/contacts
   * body: { firstName, lastName, whatsappNumber, email?, address? }
   */
  create = async (req: Request, res: Response): Promise<void> => {
    const dealershipId = req.user?.dealershipId ?? null;
    if (!dealershipId) {
      res.status(400).json({
        error:
          "No dealership scope. Please use a dealership-scoped user (or add dealership selection).",
      });
      return;
    }

    const firstName =
      typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName =
      typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
    const whatsappNumber =
      typeof req.body?.whatsappNumber === "string"
        ? req.body.whatsappNumber.trim()
        : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim() : undefined;
    const address =
      typeof req.body?.address === "string" ? req.body.address.trim() : undefined;

    if (!firstName || !lastName || !whatsappNumber) {
      res.status(400).json({
        error: "firstName, lastName and whatsappNumber are required",
      });
      return;
    }

    try {
      const contact = await this.repository.findOrCreate(dealershipId, {
        firstName,
        lastName,
        whatsappNumber,
        email: email || undefined,
        address: address || undefined,
      });

      const lead = await this.crmLeadRepository.upsertFromSource({
        dealershipId,
        contactId: contact.id,
        sourceType: "import",
        sourceId: contact.id,
      });

      res.json({ contact, lead });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Update a contact (tenant-scoped).
   * PATCH /api/contacts/:id
   * body: { firstName?, lastName?, whatsappNumber?, email?, address? }
   */
  update = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user?.organizationId;
    const dealershipId = req.user?.dealershipId;
    const isOrgAdmin =
      req.user?.role === "super_admin" || req.user?.role === "admin";

    if (!organizationId && !dealershipId) {
      res.status(401).json({ error: "Not authenticated or no dealership scope" });
      return;
    }

    const id = req.params.id as string;

    const firstName =
      typeof req.body?.firstName === "string" ? req.body.firstName.trim() : undefined;
    const lastName =
      typeof req.body?.lastName === "string" ? req.body.lastName.trim() : undefined;
    const whatsappNumber =
      typeof req.body?.whatsappNumber === "string"
        ? req.body.whatsappNumber.trim()
        : undefined;
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim()
        : req.body?.email === null
          ? null
          : undefined;
    const address =
      typeof req.body?.address === "string"
        ? req.body.address.trim()
        : req.body?.address === null
          ? null
          : undefined;

    if (
      firstName === undefined &&
      lastName === undefined &&
      whatsappNumber === undefined &&
      email === undefined &&
      address === undefined
    ) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    if (firstName !== undefined && !firstName) {
      res.status(400).json({ error: "firstName cannot be empty" });
      return;
    }
    if (lastName !== undefined && !lastName) {
      res.status(400).json({ error: "lastName cannot be empty" });
      return;
    }
    if (whatsappNumber !== undefined && !whatsappNumber) {
      res.status(400).json({ error: "whatsappNumber cannot be empty" });
      return;
    }

    try {
      const existing =
        isOrgAdmin && organizationId
          ? await this.repository.findByIdAndOrganization(id, organizationId)
          : await this.repository.findByIdAndDealership(id, dealershipId!);

      if (!existing) {
        res.status(404).json({ error: "Contact not found" });
        return;
      }

      const normalizedWhatsappNumber =
        whatsappNumber !== undefined
          ? normalizePhoneNumber(whatsappNumber)
          : undefined;

      const updated = await prisma.contact.update({
        where: { id: existing.id },
        data: {
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
          whatsappNumber: whatsappNumber ?? undefined,
          normalizedWhatsappNumber,
          email,
          address,
        },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };
}
