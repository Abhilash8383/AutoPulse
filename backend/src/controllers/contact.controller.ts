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

  /**
   * Get all activity for a contact across the 4 source modules.
   * GET /api/contacts/:id/activity
   */
  activity = async (req: Request, res: Response): Promise<void> => {
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

      const [visitors, digitalEnquiries, fieldInquiries, deliveryTickets] =
        await Promise.all([
          prisma.visitor.findMany({
            where: { contactId: contact.id },
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              sessions: { select: { id: true, createdAt: true, status: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
          prisma.digitalEnquiry.findMany({
            where: { contactId: contact.id },
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              reason: true,
              leadScope: true,
              leadSourceId: true,
              interestedModelId: true,
              interestedVariantId: true,
              modelText: true,
              sourceText: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
          prisma.fieldInquiry.findMany({
            where: { contactId: contact.id },
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              reason: true,
              leadScope: true,
              leadSourceId: true,
              interestedModelId: true,
              interestedVariantId: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
          prisma.deliveryTicket.findMany({
            where: { contactId: contact.id },
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              deliveryDate: true,
              status: true,
              modelId: true,
              variantId: true,
              description: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
        ]);

      res.json({ visitors, digitalEnquiries, fieldInquiries, deliveryTickets });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  /**
   * Unified activity feed across the 4 intake modules.
   * This is used by the Contacts page table so pagination/Total Results
   * reflect activity rows (e.g. Daily Walkins + Digital Enquiry + Field Inquiry + Delivery Update).
   *
   * GET /api/contacts/activity?limit=&skip=&search=
   */
  activityFeed = async (req: Request, res: Response): Promise<void> => {
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
      let dealershipIds: string[] = [];
      if (isOrgAdmin && organizationId) {
        const dealerships = await prisma.dealership.findMany({
          where: { organizationId },
          select: { id: true },
        });
        dealershipIds = dealerships.map((d) => d.id);
      } else if (dealershipId) {
        dealershipIds = [dealershipId];
      }

      if (dealershipIds.length === 0) {
        res.json({
          activities: [],
          total: 0,
          limit,
          skip,
          hasMore: false,
        });
        return;
      }

      // Fetch enough rows to build a single sorted feed.
      // For your current datasets (234 rows total), this is safe and exact.
      const [visitors, digitalEnquiries, fieldInquiries, deliveryTickets] =
        await Promise.all([
          prisma.visitor.findMany({
            where: { dealershipId: { in: dealershipIds } },
            select: {
              id: true,
              createdAt: true,
              contactId: true,
              firstName: true,
              lastName: true,
              whatsappNumber: true,
              email: true,
              address: true,
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  whatsappNumber: true,
                  email: true,
                  address: true,
                  createdAt: true,
                  updatedAt: true,
                  dealershipId: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.digitalEnquiry.findMany({
            where: { dealershipId: { in: dealershipIds } },
            select: {
              id: true,
              createdAt: true,
              contactId: true,
              firstName: true,
              lastName: true,
              whatsappNumber: true,
              email: true,
              address: true,
              reason: true,
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  whatsappNumber: true,
                  email: true,
                  address: true,
                  createdAt: true,
                  updatedAt: true,
                  dealershipId: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.fieldInquiry.findMany({
            where: { dealershipId: { in: dealershipIds } },
            select: {
              id: true,
              createdAt: true,
              contactId: true,
              firstName: true,
              lastName: true,
              whatsappNumber: true,
              email: true,
              address: true,
              reason: true,
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  whatsappNumber: true,
                  email: true,
                  address: true,
                  createdAt: true,
                  updatedAt: true,
                  dealershipId: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.deliveryTicket.findMany({
            where: { dealershipId: { in: dealershipIds } },
            select: {
              id: true,
              deliveryDate: true,
              contactId: true,
              firstName: true,
              lastName: true,
              whatsappNumber: true,
              email: true,
              address: true,
              status: true,
              description: true,
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  whatsappNumber: true,
                  email: true,
                  address: true,
                  createdAt: true,
                  updatedAt: true,
                  dealershipId: true,
                },
              },
            },
            orderBy: { deliveryDate: "desc" },
          }),
        ]);

      type ActivityRow = {
        id: string;
        activityType: "visitor" | "digital_enquiry" | "field_inquiry" | "delivery_ticket";
        createdAt: Date;
        contactId: string | null;
        contact: {
          id: string;
          firstName: string;
          lastName: string;
          whatsappNumber: string;
          email: string | null;
          address: string | null;
          createdAt: Date;
          updatedAt: Date;
          dealershipId: string | null;
        } | null;
        fallback: {
          firstName: string | null;
          lastName: string | null;
          whatsappNumber: string | null;
          email: string | null;
          address: string | null;
        };
      };

      const activities: ActivityRow[] = [
        ...visitors.map((v) => ({
          id: v.id,
          activityType: "visitor" as const,
          createdAt: v.createdAt,
          contactId: v.contactId ?? null,
          contact: v.contact ?? null,
          fallback: {
            firstName: v.firstName ?? null,
            lastName: v.lastName ?? null,
            whatsappNumber: v.whatsappNumber ?? null,
            email: v.email ?? null,
            address: v.address ?? null,
          },
        })),
        ...digitalEnquiries.map((e) => ({
          id: e.id,
          activityType: "digital_enquiry" as const,
          createdAt: e.createdAt,
          contactId: e.contactId ?? null,
          contact: e.contact ?? null,
          fallback: {
            firstName: e.firstName ?? null,
            lastName: e.lastName ?? null,
            whatsappNumber: e.whatsappNumber ?? null,
            email: e.email ?? null,
            address: e.address ?? null,
          },
        })),
        ...fieldInquiries.map((f) => ({
          id: f.id,
          activityType: "field_inquiry" as const,
          createdAt: f.createdAt,
          contactId: f.contactId ?? null,
          contact: f.contact ?? null,
          fallback: {
            firstName: f.firstName ?? null,
            lastName: f.lastName ?? null,
            whatsappNumber: f.whatsappNumber ?? null,
            email: f.email ?? null,
            address: f.address ?? null,
          },
        })),
        ...deliveryTickets.map((t) => ({
          id: t.id,
          activityType: "delivery_ticket" as const,
          createdAt: t.deliveryDate,
          contactId: t.contactId ?? null,
          contact: t.contact ?? null,
          fallback: {
            firstName: t.firstName ?? null,
            lastName: t.lastName ?? null,
            whatsappNumber: t.whatsappNumber ?? null,
            email: t.email ?? null,
            address: t.address ?? null,
          },
        })),
      ];

      const normalizedSearch = search?.trim().toLowerCase();
      const filtered =
        normalizedSearch && normalizedSearch.length > 0
          ? activities.filter((a) => {
              const values = [
                a.contact?.firstName,
                a.contact?.lastName,
                a.contact?.whatsappNumber,
                a.contact?.email,
                a.contact?.address,
                a.fallback.firstName,
                a.fallback.lastName,
                a.fallback.whatsappNumber,
                a.fallback.email,
                a.fallback.address,
              ];
              const combined = values
                .filter((v) => typeof v === "string" && v.trim().length > 0)
                .join(" ")
                .toLowerCase();
              return combined.includes(normalizedSearch);
            })
          : activities;

      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const paged = filtered.slice(skip, skip + limit);

      res.json({
        activities: paged.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          contact: a.contact
            ? {
                ...a.contact,
                createdAt: a.contact.createdAt.toISOString(),
                updatedAt: a.contact.updatedAt.toISOString(),
              }
            : null,
        })),
        total: filtered.length,
        limit,
        skip,
        hasMore: skip + paged.length < filtered.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };
}
