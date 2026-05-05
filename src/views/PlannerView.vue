<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import WeekPicker from "../components/WeekPicker.vue";
import WeekGrid from "../components/WeekGrid.vue";
import { useItemsStore } from "../stores/items";
import { usePlansStore } from "../stores/plans";
import { previousMonday, snapToMonday, type SlotKey } from "../lib/dates";
import type { ItemSummary } from "../lib/types";

const route = useRoute();
const router = useRouter();
const itemsStore = useItemsStore();
const plansStore = usePlansStore();

const currentWeek = ref<string>(snapToMonday(String(route.params.weekStart ?? "")));
const dirty = ref(false);
const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null);

watch(
  () => route.params.weekStart,
  (val) => {
    if (typeof val !== "string") return;
    const snapped = snapToMonday(val);
    if (snapped !== currentWeek.value) currentWeek.value = snapped;
    if (snapped !== val) {
      router.replace({ name: "planner", params: { weekStart: snapped } });
    }
  }
);

watch(currentWeek, async (val, prev) => {
  if (val !== prev) {
    if (val !== route.params.weekStart) {
      await router.replace({ name: "planner", params: { weekStart: val } });
    }
    await plansStore.loadWeek(val);
    dirty.value = false;
  }
});

onMounted(async () => {
  await Promise.all([itemsStore.refresh(), plansStore.loadWeek(currentWeek.value)]);
});

function scheduleSave() {
  dirty.value = true;
  if (saveTimer.value) clearTimeout(saveTimer.value);
  saveTimer.value = setTimeout(async () => {
    await plansStore.save();
    dirty.value = false;
  }, 700);
}

function onSlotChange(payload: { day: number; slot: SlotKey; itemId: number | null }) {
  plansStore.setSlot(payload.day, payload.slot, payload.itemId);
  scheduleSave();
}

function onNotesInput(ev: Event) {
  plansStore.notes = (ev.target as HTMLTextAreaElement).value;
  scheduleSave();
}

async function copyFromPrevious() {
  if (!confirm("Copy items from the previous week? This will overwrite the current selections.")) {
    return;
  }
  const prev = previousMonday(currentWeek.value);
  await plansStore.copyFromWeek(prev);
  scheduleSave();
}

async function clearAll() {
  if (!confirm("Clear all items for this week?")) return;
  for (let day = 1; day <= 5; day++) {
    plansStore.setSlot(day, "am_snack", null);
    plansStore.setSlot(day, "lunch", null);
    plansStore.setSlot(day, "pm_snack", null);
  }
  scheduleSave();
}

function normalizeCategory(category: string | null): string {
  return (category ?? "").trim().toLowerCase();
}

function categoryMatchesSlot(category: string | null, slot: SlotKey): boolean {
  const value = normalizeCategory(category);
  if (!value) return false;
  if (slot === "lunch") return value.includes("lunch");
  if (slot === "am_snack") return value.includes("am") || value.includes("snack");
  return value.includes("pm") || value.includes("snack");
}

function shuffleRandom<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function buildSlotPool(slot: SlotKey, allItems: ItemSummary[]): ItemSummary[] {
  const matched = allItems.filter((item) => categoryMatchesSlot(item.category, slot));
  const base = matched.length > 0 ? matched : allItems;
  return shuffleRandom(base);
}

function pickNextItem(pool: ItemSummary[], startIndex: number, usedForDay: Set<number>): number | null {
  if (pool.length === 0) return null;
  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(startIndex + offset) % pool.length];
    if (!usedForDay.has(candidate.id)) return candidate.id;
  }
  return pool[startIndex % pool.length].id;
}

async function autoGenerateFromItems() {
  if (itemsStore.items.length === 0) {
    alert("Add menu items first, then generate a schedule.");
    return;
  }

  const amPool = buildSlotPool("am_snack", itemsStore.items);
  const lunchPool = buildSlotPool("lunch", itemsStore.items);
  const pmPool = buildSlotPool("pm_snack", itemsStore.items);
  let amIndex = 0;
  let lunchIndex = 0;
  let pmIndex = 0;

  for (let day = 1; day <= 5; day++) {
    const usedForDay = new Set<number>();
    const am = pickNextItem(amPool, amIndex, usedForDay);
    if (am) usedForDay.add(am);
    const lunch = pickNextItem(lunchPool, lunchIndex, usedForDay);
    if (lunch) usedForDay.add(lunch);
    const pm = pickNextItem(pmPool, pmIndex, usedForDay);

    amIndex++;
    lunchIndex++;
    pmIndex++;

    plansStore.setSlot(day, "am_snack", am);
    plansStore.setSlot(day, "lunch", lunch);
    plansStore.setSlot(day, "pm_snack", pm);
  }

  scheduleSave();
}

</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1>Weekly Planner</h1>
        <div class="page-subtitle">
          Drop menu items into AM Snack, Lunch, and PM Snack for each weekday. Changes save automatically.
        </div>
      </div>
      <WeekPicker v-model="currentWeek" />
    </div>

    <div v-if="plansStore.error" class="error-banner">{{ plansStore.error }}</div>

    <div class="toolbar">
      <button class="btn btn-secondary" @click="autoGenerateFromItems">Generate from Recipe Book</button>
      <RouterLink
        :to="{ name: 'print-schedule', params: { weekStart: currentWeek } }"
        class="btn btn-secondary"
        target="_blank"
      >
        Export PDF
      </RouterLink>
      <button class="btn" @click="copyFromPrevious">Copy from previous week</button>
      <button class="btn btn-ghost" @click="clearAll">Clear all</button>
    </div>

    <div class="card notes-card">
      <label for="plan-notes">Week notes</label>
      <textarea
        id="plan-notes"
        rows="2"
        :value="plansStore.notes"
        @input="onNotesInput"
        placeholder="Field trip Wednesday: pack-out lunches"
      />
    </div>

    <div v-if="plansStore.loading && !plansStore.plan" class="empty-state">
      <span class="spinner" /> Loading week...
    </div>

    <div v-else class="card">
      <WeekGrid
        :slot-map="plansStore.slotMap"
        :items="itemsStore.items"
        @change="onSlotChange"
      />
    </div>

  </section>
</template>

<style scoped>
.notes-card {
  margin-bottom: 16px;
}
.toolbar .btn {
  text-decoration: none;
}
</style>
