import apiClient from "@/lib/api";

export interface DealershipUser {
  id: string;
  email: string;
}

export async function getDealershipUsers(): Promise<{ users: DealershipUser[] }> {
  const { data } = await apiClient.get<{ users: DealershipUser[] }>("/dealership/users");
  return data;
}

