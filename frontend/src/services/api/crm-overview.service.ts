import apiClient from "@/lib/api";

export interface CrmOverviewOwnerPerformance {
  ownerUserId: string | null;
  ownerEmail: string;
  totalAssigned: number;
  open: number;
  won: number;
  lost: number;
  cleared: number;
}

export interface CrmOverviewResponse {
  contactsCreated: {
    day: number;
    week: number;
    month: number;
    year: number;
    lifetime: number;
  };
  leads: {
    total: number;
    open: number;
    won: number;
    lost: number;
  };
  clearedLeads: {
    day: number;
    week: number;
    month: number;
    year: number;
    lifetime: number;
  };
  ownerPerformance: CrmOverviewOwnerPerformance[];
  generatedAt: string;
}

export async function getCrmOverview(): Promise<CrmOverviewResponse> {
  const { data } = await apiClient.get<CrmOverviewResponse>("/crm/overview");
  return data;
}
