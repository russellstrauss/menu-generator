import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../lib/api";
import type { ItemDetail, ItemSummary } from "../lib/types";

export const useItemsStore = defineStore("items", () => {
  const items = ref<ItemSummary[]>([]);
  const itemsById = ref<Record<number, ItemDetail>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function refresh(query?: string) {
    loading.value = true;
    error.value = null;
    try {
      items.value = await api.listItems(query);
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchDetail(id: number): Promise<ItemDetail> {
    const detail = await api.getItem(id);
    itemsById.value[id] = detail;
    return detail;
  }

  async function create(input: Partial<ItemDetail>): Promise<ItemDetail> {
    const created = await api.createItem(input);
    itemsById.value[created.id] = created;
    items.value = [
      ...items.value.filter((i) => i.id !== created.id),
      {
        id: created.id,
        name: created.name,
        category: created.category,
        notes: created.notes,
        updated_at: created.updated_at,
      },
    ].sort((a, b) => a.name.localeCompare(b.name));
    return created;
  }

  async function update(id: number, input: Partial<ItemDetail>): Promise<ItemDetail> {
    const updated = await api.updateItem(id, input);
    itemsById.value[id] = updated;
    items.value = items.value.map((i) =>
      i.id === id
        ? {
            id: updated.id,
            name: updated.name,
            category: updated.category,
            notes: updated.notes,
            updated_at: updated.updated_at,
          }
        : i
    );
    items.value.sort((a, b) => a.name.localeCompare(b.name));
    return updated;
  }

  async function remove(id: number): Promise<void> {
    await api.deleteItem(id);
    delete itemsById.value[id];
    items.value = items.value.filter((i) => i.id !== id);
  }

  return {
    items,
    itemsById,
    loading,
    error,
    refresh,
    fetchDetail,
    create,
    update,
    remove,
  };
});
