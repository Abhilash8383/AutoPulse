import apiClient from "@/lib/api";

export type CrmLeadSourceType =
  | "visitor"
  | "digital_enquiry"
  | "field_inquiry"
  | "import";

export type CrmLeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "appointment"
  | "test_drive"
  | "negotiation"
  | "won"
  | "lost";

export type CrmLeadStatus = "open" | "won" | "lost";

export interface CrmLeadOwnerUser {
  id: string;
  email: string;
}

export interface CrmLeadContact {
  id: string;
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email: string | null;
  address: string | null;
}

export interface CrmLead {
  id: string;
  dealershipId: string | null;
  contactId: string;
  sourceType: CrmLeadSourceType;
  sourceId: string;
  stage: CrmLeadStage;
  status: CrmLeadStatus;
  ownerUserId: string | null;
  ownerUser: CrmLeadOwnerUser | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: CrmLeadContact;
}

export interface CrmLeadsResponse {
  leads: CrmLead[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export async function getCrmLeads(params?: {
  limit?: number;
  skip?: number;
  search?: string;
  stage?: CrmLeadStage;
  status?: CrmLeadStatus;
  ownerUserId?: string;
  overdue?: boolean;
  sourceType?: CrmLeadSourceType;
}): Promise<CrmLeadsResponse> {
  const { data } = await apiClient.get<CrmLeadsResponse>("/crm/leads", {
    params: {
      limit: params?.limit ?? 50,
      skip: params?.skip ?? 0,
      ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params?.stage ? { stage: params.stage } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.ownerUserId ? { ownerUserId: params.ownerUserId } : {}),
      ...(params?.overdue ? { overdue: true } : {}),
      ...(params?.sourceType ? { sourceType: params.sourceType } : {}),
    },
  });
  return data;
}

export async function getCrmLeadById(id: string): Promise<CrmLead> {
  const { data } = await apiClient.get<CrmLead>(`/crm/leads/${id}`);
  return data;
}

export async function patchCrmLead(
  id: string,
  payload: Partial<{
    stage: CrmLeadStage;
    status: CrmLeadStatus;
    ownerUserId: string | null;
    nextFollowUpAt: string | null;
  }>,
): Promise<CrmLead> {
  const { data } = await apiClient.patch<CrmLead>(`/crm/leads/${id}`, payload);
  return data;
}

export async function createLeadFromContact(contactId: string): Promise<{ lead: CrmLead }> {
  const { data } = await apiClient.post<{ lead: CrmLead }>("/crm/leads/from-contact", {
    contactId,
  });
  return data;
}

