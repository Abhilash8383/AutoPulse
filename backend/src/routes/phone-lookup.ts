import { Router, Request, Response, type Router as ExpressRouter } from "express";
import prisma from "../lib/db";
import { authenticate, asyncHandler } from "../middleware/auth";
import { normalizePhoneNumber } from "../utils/phone-formatter";
import { getVisitorPhone } from "../utils/contact-resolver";

const router: ExpressRouter = Router();

// Single phone lookup
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const phoneNumber = req.query.phone as string;

    if (!phoneNumber) {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    const [visitors, digitalEnquiries, fieldInquiries, deliveryTickets] =
      await Promise.all([
        prisma.visitor.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            OR: [
              { whatsappNumber: phoneNumber },
              { contact: { whatsappNumber: phoneNumber } },
            ],
          },
          select: {
            id: true,
            contact: { select: { whatsappNumber: true, firstName: true, lastName: true } },
            whatsappNumber: true,
            firstName: true,
            lastName: true,
          },
          take: 1,
        }),
        prisma.digitalEnquiry.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            OR: [
              { whatsappNumber: phoneNumber },
              { contact: { whatsappNumber: phoneNumber } },
            ],
          },
          select: {
            id: true,
            contact: { select: { whatsappNumber: true, firstName: true, lastName: true } },
            whatsappNumber: true,
            firstName: true,
            lastName: true,
          },
          take: 1,
        }),
        prisma.fieldInquiry.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            OR: [
              { whatsappNumber: phoneNumber },
              { contact: { whatsappNumber: phoneNumber } },
            ],
          },
          select: {
            id: true,
            contact: { select: { whatsappNumber: true, firstName: true, lastName: true } },
            whatsappNumber: true,
            firstName: true,
            lastName: true,
          },
          take: 1,
        }),
        prisma.deliveryTicket.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            whatsappNumber: phoneNumber,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
          take: 1,
        }),
      ]);

    const results = {
      dailyWalkins: visitors.length > 0,
      digitalEnquiry: digitalEnquiries.length > 0,
      fieldInquiry: fieldInquiries.length > 0,
      deliveryUpdate: deliveryTickets.length > 0,
      visitorId: visitors[0]?.id || null,
      enquiryId: digitalEnquiries[0]?.id || null,
      fieldInquiryId: fieldInquiries[0]?.id || null,
      ticketId: deliveryTickets[0]?.id || null,
    };

    res.json(results);
  })
);

// Batch phone lookup
router.post(
  "/",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user.dealershipId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { phones } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      res.status(400).json({ error: "Phone numbers array is required" });
      return;
    }

    const phoneNumbers = phones.slice(0, 1000);
    const uniquePhones = [...new Set(phoneNumbers)];

    const [visitors, digitalEnquiries, fieldInquiries, deliveryTickets] =
      await Promise.all([
        prisma.visitor.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            OR: [
              { whatsappNumber: { in: uniquePhones } },
              { contact: { whatsappNumber: { in: uniquePhones } } },
            ],
          },
          select: {
            id: true,
            contact: { select: { whatsappNumber: true } },
            whatsappNumber: true,
            firstName: true,
            lastName: true,
          },
        }),
        prisma.digitalEnquiry.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            OR: [
              { whatsappNumber: { in: uniquePhones } },
              { contact: { whatsappNumber: { in: uniquePhones } } },
            ],
          },
          select: {
            id: true,
            contact: { select: { whatsappNumber: true } },
            whatsappNumber: true,
            firstName: true,
            lastName: true,
          },
        }),
        prisma.fieldInquiry.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            OR: [
              { whatsappNumber: { in: uniquePhones } },
              { contact: { whatsappNumber: { in: uniquePhones } } },
            ],
          },
          select: {
            id: true,
            contact: { select: { whatsappNumber: true } },
            whatsappNumber: true,
            firstName: true,
            lastName: true,
          },
        }),
        prisma.deliveryTicket.findMany({
          where: {
            dealershipId: req.user.dealershipId,
            whatsappNumber: { in: uniquePhones },
          },
          select: {
            id: true,
            whatsappNumber: true,
            firstName: true,
            lastName: true,
          },
        }),
      ]);

    const visitorMap = new Map(
      visitors.map((v) => [normalizePhoneNumber(getVisitorPhone(v)), v])
    );
    const enquiryMap = new Map(
      digitalEnquiries.map((e) => [
        normalizePhoneNumber(e.contact?.whatsappNumber ?? e.whatsappNumber ?? ""),
        e,
      ])
    );
    const fieldInquiryMap = new Map(
      fieldInquiries.map((f) => [
        normalizePhoneNumber(f.contact?.whatsappNumber ?? f.whatsappNumber ?? ""),
        f,
      ])
    );
    const ticketMap = new Map(
      deliveryTickets.map((t) => [normalizePhoneNumber(t.whatsappNumber), t])
    );

    const results: Record<
      string,
      {
        dailyWalkins: boolean;
        digitalEnquiry: boolean;
        fieldInquiry: boolean;
        deliveryUpdate: boolean;
        visitorId: string | null;
        enquiryId: string | null;
        fieldInquiryId: string | null;
        ticketId: string | null;
      }
    > = {};

    uniquePhones.forEach((phone) => {
      const key = normalizePhoneNumber(phone);
      const visitor = visitorMap.get(key);
      const enquiry = enquiryMap.get(key);
      const fieldInquiry = fieldInquiryMap.get(key);
      const ticket = ticketMap.get(key);

      results[phone] = {
        dailyWalkins: !!visitor,
        digitalEnquiry: !!enquiry,
        fieldInquiry: !!fieldInquiry,
        deliveryUpdate: !!ticket,
        visitorId: visitor?.id || null,
        enquiryId: enquiry?.id || null,
        fieldInquiryId: fieldInquiry?.id || null,
        ticketId: ticket?.id || null,
      };
    });

    res.json(results);
  })
);

export default router;

