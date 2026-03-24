export interface UpdateDigitalEnquiryDetailsDto {
  leadScope?: "hot" | "warm" | "cold";
  leadSourceId?: string | null;
  interestedModelId?: string | null;
  interestedVariantId?: string | null;
  reason?: string;
  modelText?: string | null;
  sourceText?: string | null;
}

