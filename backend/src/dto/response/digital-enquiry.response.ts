import { DigitalEnquiry, LeadSource, VehicleModel, VehicleCategory } from "@prisma/client";

/**
 * Digital Enquiry Response DTO
 */
export interface DigitalEnquiryWithRelations extends DigitalEnquiry {
  leadSource: LeadSource | null;
  model: (VehicleModel & { category: VehicleCategory }) | null;
}

export interface CreateDigitalEnquiryResponse {
  success: boolean;
  enquiry: {
    id: string;
    firstName: string;
    lastName: string;
  };
  message: {
    status: "sent" | "failed" | "not_sent" | "not_configured";
    error: string | null;
  };
}

export interface UpdateLeadScopeResponse {
  success: boolean;
  enquiry: DigitalEnquiryWithRelations;
}

export interface UpdateDigitalEnquiryDetailsResponse {
  success: boolean;
  enquiry: DigitalEnquiryWithRelations;
}
