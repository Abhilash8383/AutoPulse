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
