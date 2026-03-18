import apiClient from "@/lib/api";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  dealershipId: string | null;
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export type ContactActivityType =
  | "visitor"
  | "digital_enquiry"
  | "field_inquiry"
  | "delivery_ticket";

export interface ContactActivityRow {
  id: string;
  activityType: ContactActivityType;
  createdAt: string;
  contactId: string | null;
  contact: Contact | null;
  fallback: {
    firstName: string | null;
    lastName: string | null;
    whatsappNumber: string | null;
    email: string | null;
    address: string | null;
  };
}

export interface ContactActivitiesResponse {
  activities: ContactActivityRow[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export interface CreateContactResponse {
  contact: Contact;
  lead: { id: string };
}

export interface ContactActivityResponse {
  visitors: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    sessions: Array<{ id: string; createdAt: string; status: string }>;
  }>;
  digitalEnquiries: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    reason: string;
    leadScope: string;
    leadSourceId: string | null;
    interestedModelId: string | null;
    interestedVariantId: string | null;
    modelText: string | null;
    sourceText: string | null;
  }>;
  fieldInquiries: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    reason: string;
    leadScope: string;
    leadSourceId: string | null;
    interestedModelId: string | null;
    interestedVariantId: string | null;
  }>;
  deliveryTickets: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    deliveryDate: string;
    status: string;
    modelId: string;
    variantId: string | null;
    description: string | null;
  }>;
}

export async function updateContact(
  id: string,
  payload: Partial<{
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    email: string | null;
    address: string | null;
  }>,
): Promise<Contact> {
  const { data } = await apiClient.patch<Contact>(`/contacts/${id}`, payload);
  return data;
}

export async function getContacts(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<ContactsResponse> {
  const { data } = await apiClient.get<ContactsResponse>("/contacts", {
    params: {
      limit: params?.limit ?? 50,
      skip: params?.skip ?? 0,
      ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
    },
  });
  return data;
}

export async function getContactActivities(params?: {
  limit?: number;
  skip?: number;
  search?: string;
}): Promise<ContactActivitiesResponse> {
  const { data } = await apiClient.get<ContactActivitiesResponse>("/contacts/activity", {
    params: {
      limit: params?.limit ?? 50,
      skip: params?.skip ?? 0,
      ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
    },
  });
  return data;
}

export async function createContact(payload: {
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email?: string;
  address?: string;
}): Promise<CreateContactResponse> {
  const { data } = await apiClient.post<CreateContactResponse>("/contacts", payload);
  return data;
}

export async function getContactActivity(contactId: string): Promise<ContactActivityResponse> {
  const { data } = await apiClient.get<ContactActivityResponse>(
    `/contacts/${contactId}/activity`,
  );
  return data;
}
