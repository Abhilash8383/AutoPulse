import apiClient from "@/lib/api";

export interface CrmNoteUser {
  id: string;
  email: string;
}

export interface CrmNote {
  id: string;
  dealershipId: string | null;
  contactId: string;
  leadId: string | null;
  body: string;
  createdByUserId: string | null;
  createdByUser: CrmNoteUser | null;
  createdAt: string;
}

export async function getCrmNotes(params: {
  contactId: string;
  leadId?: string;
}): Promise<{ notes: CrmNote[] }> {
  const { data } = await apiClient.get<{ notes: CrmNote[] }>("/crm/notes", {
    params,
  });
  return data;
}

export async function createCrmNote(payload: {
  contactId: string;
  leadId?: string;
  body: string;
}): Promise<CrmNote> {
  const { data } = await apiClient.post<CrmNote>("/crm/notes", payload);
  return data;
}

