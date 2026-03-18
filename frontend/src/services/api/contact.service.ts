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

export interface CreateContactResponse {
  contact: Contact;
  lead: { id: string };
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
