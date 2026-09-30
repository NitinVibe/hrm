import api from "./client";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  page: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: {
    employees: SearchResultItem[];
    departments: SearchResultItem[];
    designations: SearchResultItem[];
    branches: SearchResultItem[];
    documents: SearchResultItem[];
    announcements: SearchResultItem[];
    candidates: SearchResultItem[];
    leaves: SearchResultItem[];
  };
}

export async function globalSearch(query: string): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>("/search", { params: { q: query } });
  return response.data;
}
