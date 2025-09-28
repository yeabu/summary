import { getValidAccessTokenOrRefresh } from "../utils/authToken";
import { API_URL } from "@/config";

export interface SupplierSuggestion {
  id: number;
  name: string;
  count: number;
}

export interface ProductSuggestion {
  product_id?: number;
  product_name: string;
  avg_price: number;
  times: number;
  last_date: string;
}

export class PurchaseSuggestApi {
  private apiUrl = API_URL;

  private async apiCall<T>(endpoint: string): Promise<T> {
    const token = await getValidAccessTokenOrRefresh();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}${endpoint}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  async supplierSuggestions(limit = 15): Promise<SupplierSuggestion[]> {
    return this.apiCall(`/api/purchase/supplier-suggestions?limit=${limit}`);
    }

  async productSuggestions(supplierId: number, limit = 15): Promise<ProductSuggestion[]> {
    return this.apiCall(`/api/purchase/product-suggestions?supplier_id=${supplierId}&limit=${limit}`);
  }
}
