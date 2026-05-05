import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../lib/api";
import { SLOTS, type SlotKey } from "../lib/dates";
import type { PlanSlot, ShoppingListResponse, WeeklyPlan } from "../lib/types";

type SlotMap = Record<number, Record<SlotKey, number | null>>;

function slotsToMap(slots: PlanSlot[]): SlotMap {
  const map: SlotMap = {};
  for (let day = 1; day <= 5; day++) {
    map[day] = { am_snack: null, lunch: null, pm_snack: null };
  }
  for (const s of slots) {
    if (map[s.day]) map[s.day][s.slot] = s.item_id;
  }
  return map;
}

function mapToSlots(map: SlotMap): { day: number; slot: SlotKey; item_id: number | null }[] {
  const out: { day: number; slot: SlotKey; item_id: number | null }[] = [];
  for (let day = 1; day <= 5; day++) {
    for (const { key } of SLOTS) {
      out.push({ day, slot: key, item_id: map[day]?.[key] ?? null });
    }
  }
  return out;
}

export const usePlansStore = defineStore("plans", () => {
  const currentWeek = ref<string | null>(null);
  const plan = ref<WeeklyPlan | null>(null);
  const slotMap = ref<SlotMap>(slotsToMap([]));
  const notes = ref<string>("");
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const lastSaved = ref<Date | null>(null);
  const shoppingList = ref<ShoppingListResponse | null>(null);

  async function loadWeek(weekStart: string) {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.getPlan(weekStart);
      currentWeek.value = weekStart;
      plan.value = data;
      slotMap.value = slotsToMap(data.slots);
      notes.value = data.plan?.notes ?? "";
      lastSaved.value = data.plan?.updated_at ? new Date(data.plan.updated_at + "Z") : null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  }

  function setSlot(day: number, slot: SlotKey, itemId: number | null) {
    if (!slotMap.value[day]) slotMap.value[day] = { am_snack: null, lunch: null, pm_snack: null };
    slotMap.value[day][slot] = itemId;
  }

  async function save() {
    if (!currentWeek.value) return;
    saving.value = true;
    error.value = null;
    try {
      const result = await api.savePlan(currentWeek.value, {
        notes: notes.value || null,
        slots: mapToSlots(slotMap.value),
      });
      plan.value = result;
      slotMap.value = slotsToMap(result.slots);
      lastSaved.value = new Date();
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      saving.value = false;
    }
  }

  async function copyFromWeek(sourceWeek: string) {
    const source = await api.getPlan(sourceWeek);
    slotMap.value = slotsToMap(source.slots);
    if (source.plan?.notes) notes.value = source.plan.notes;
  }

  async function loadShoppingList(weekStart: string) {
    shoppingList.value = await api.getShoppingList(weekStart);
  }

  return {
    currentWeek,
    plan,
    slotMap,
    notes,
    loading,
    saving,
    error,
    lastSaved,
    shoppingList,
    loadWeek,
    setSlot,
    save,
    copyFromWeek,
    loadShoppingList,
  };
});
