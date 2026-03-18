import apiClient from "@/lib/api";

export interface CrmTimelineUser {
  id: string;
  email: string;
}

export interface CrmTimelineEvent {
  id: string;
  dealershipId: string | null;
  contactId: string;
  leadId: string | null;
  type: string;
  payload: any;
  createdByUserId: string | null;
  createdByUser: CrmTimelineUser | null;
  createdAt: string;
}

export async function getCrmTimeline(params: {
  contactId: string;
  leadId?: string;
}): Promise<{ events: CrmTimelineEvent[] }> {
  const { data } = await apiClient.get<{ events: CrmTimelineEvent[] }>(
    "/crm/timeline",
    { params },
  );
  return data;
}

