export interface UpdateFieldInquiryDetailsDto {
  leadScope?: "hot" | "warm" | "cold";
  leadSourceId?: string | null;
  interestedModelId?: string | null;
  interestedVariantId?: string | null;
  reason?: string;
}

