import { getValidAccessTokenOrRefresh } from "../utils/authToken";

export interface ProductItem {
  id: number;
  name: string;
  base_unit?: string;
  spec?: string;
  unit_price?: number;
  currency?: string;
  supplier_id?: number;
  status?: string;
  supplier?: { id: number; name: string } | null;
}

export interface ProductListResponse {
  records: ProductItem[];
  total: number;
}

export class ProductApi {
  private apiUrl = import.meta.env.VITE_API_URL;

  async upsertUnitSpecByName(product_name: string, unit: string, factor_to_base: number, kind: 'purchase' | 'usage' | 'both' = 'both', is_default = false) {
    const token = await getValidAccessTokenOrRefresh();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/product/unit-specs/upsert-by-name`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ product_name, unit, factor_to_base, kind, is_default })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || '维护规格失败');
    }
    return res.json();
  }

  private async req<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await getValidAccessTokenOrRefresh();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}${endpoint}`, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  async listProducts(q?: { name?: string; supplier_id?: number; limit?: number; offset?: number }): Promise<ProductListResponse> {
    const p = new URLSearchParams();
    if (q?.name) p.append('name', q.name);
    if (q?.supplier_id) p.append('supplier_id', String(q.supplier_id));
    if (q?.limit) p.append('limit', String(q.limit));
    if (q?.offset) p.append('offset', String(q.offset));
    return this.req(`/api/product/list?${p.toString()}`);
  }
  async createProduct(data: { name: string; base_unit?: string; spec?: string; unit_price?: number; currency?: string; supplier_id?: number; status?: string }) {
    return this.req(`/api/product/create`, { method: 'POST', body: JSON.stringify(data) });
  }
  async updateProduct(id: number, data: { name?: string; base_unit?: string; spec?: string; unit_price?: number; currency?: string; supplier_id?: number; status?: string }) {
    return this.req(`/api/product/update?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async deleteProduct(id: number) {
    return this.req(`/api/product/delete?id=${id}`, { method: 'DELETE' });
  }
  // 采购参数
  async getPurchaseParam(product_id: number): Promise<{ product_id:number; unit:string; factor_to_base:number; purchase_price:number } | null> {
    const token = await getValidAccessTokenOrRefresh();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/product/purchase-param?product_id=${product_id}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async upsertPurchaseParam(data: { product_id:number; unit:string; factor_to_base:number; purchase_price:number }) {
    return this.req(`/api/product/purchase-param/upsert`, { method: 'POST', body: JSON.stringify(data) });
  }
  async exportCsv(q?: { name?: string; supplier_id?: number }): Promise<Blob> {
    const token = await getValidAccessTokenOrRefresh();
    const p = new URLSearchParams();
    if (q?.name) p.append('name', q.name);
    if (q?.supplier_id) p.append('supplier_id', String(q.supplier_id));
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/product/export-csv?${p.toString()}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }
  async downloadImportTemplate(): Promise<Blob> {
    const token = await getValidAccessTokenOrRefresh();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/product/import-template`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }
  async importCsv(file: File): Promise<{ created: number; updated: number }> {
    const token = await getValidAccessTokenOrRefresh();
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/product/import-csv`, { method: 'POST', headers, body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async listUnitSpecs(product_id: number): Promise<Array<{ id:number; unit:string; factor_to_base:number; kind:string; is_default:boolean }>> {
    return this.req(`/api/product/unit-specs?product_id=${product_id}`);
  }
  async upsertUnitSpec(product_id: number, unit: string, factor_to_base: number, kind: 'purchase'|'usage'|'both'='both', is_default=false) {
    return this.req(`/api/product/unit-specs/upsert`, { method: 'POST', body: JSON.stringify({ product_id, unit, factor_to_base, kind, is_default }) });
  }
  async deleteUnitSpec(id: number) { return this.req(`/api/product/unit-specs/delete?id=${id}`, { method: 'DELETE' }); }
}
