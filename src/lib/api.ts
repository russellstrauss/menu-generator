import type {
  ItemDetail,
  ItemSummary,
  ShoppingListResponse,
  WeeklyPlan,
  PlanSlot,
} from "./types";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  async listItems(query?: string): Promise<ItemSummary[]> {
    const qs = query && query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    const data = await request<{ items: ItemSummary[] }>(`/api/items${qs}`);
    return data.items;
  },

  async getItem(id: number): Promise<ItemDetail> {
    const data = await request<{ item: ItemDetail }>(`/api/items/${id}`);
    return data.item;
  },

  async createItem(input: Partial<ItemDetail>): Promise<ItemDetail> {
    const data = await request<{ item: ItemDetail }>(`/api/items`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return data.item;
  },

  async updateItem(id: number, input: Partial<ItemDetail>): Promise<ItemDetail> {
    const data = await request<{ item: ItemDetail }>(`/api/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return data.item;
  },

  async deleteItem(id: number): Promise<void> {
    await request<{ ok: true }>(`/api/items/${id}`, { method: "DELETE" });
  },

  async getPlan(weekStart: string): Promise<WeeklyPlan> {
    return request<WeeklyPlan>(`/api/plans/${weekStart}`);
  },

  async savePlan(
    weekStart: string,
    payload: { notes: string | null; slots: Pick<PlanSlot, "day" | "slot" | "item_id">[] }
  ): Promise<WeeklyPlan> {
    return request<WeeklyPlan>(`/api/plans/${weekStart}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getShoppingList(weekStart: string): Promise<ShoppingListResponse> {
    return request<ShoppingListResponse>(`/api/plans/${weekStart}/shopping-list`);
  },
};
