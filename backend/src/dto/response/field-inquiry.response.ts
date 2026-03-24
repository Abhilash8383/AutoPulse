import { FieldInquiry, LeadSource, VehicleModel, VehicleCategory } from "@prisma/client";

/**
 * Field Inquiry Response DTO
 */
export interface FieldInquiryWithRelations extends FieldInquiry {
  leadSource: LeadSource | null;
  model: (VehicleModel & { category: VehicleCategory }) | null;
}

export interface CreateFieldInquiryResponse {
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
  enquiry: FieldInquiryWithRelations;
}

export interface UpdateFieldInquiryDetailsResponse {
  success: boolean;
  enquiry: FieldInquiryWithRelations;
}
