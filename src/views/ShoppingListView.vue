<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import WeekPicker from "../components/WeekPicker.vue";
import ShoppingList from "../components/ShoppingList.vue";
import { formatWeekRange, snapToMonday } from "../lib/dates";
import { api } from "../lib/api";
import type { ShoppingListResponse } from "../lib/types";

const route = useRoute();
const router = useRouter();

const currentWeek = ref(snapToMonday(String(route.params.weekStart ?? "")));
const data = ref<ShoppingListResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function load(weekStart: string) {
  loading.value = true;
  error.value = null;
  try {
    const raw = await api.getShoppingList(weekStart);
    data.value = {
      week_start: raw.week_start ?? weekStart,
      aggregated: Array.isArray(raw.aggregated) ? raw.aggregated : [],
      breakdown: Array.isArray(raw.breakdown) ? raw.breakdown : [],
    };
  } catch (err) {
    data.value = null;
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

watch(currentWeek, async (val, prev) => {
  if (val !== prev) {
    await router.replace({ name: "shopping", params: { weekStart: val } });
    await load(val);
  }
});

watch(
  () => route.params.weekStart,
  (val) => {
    if (typeof val !== "string") return;
    const snapped = snapToMonday(val);
    if (snapped !== currentWeek.value) currentWeek.value = snapped;
  }
);

onMounted(() => load(currentWeek.value));

const weekLabel = computed(() => formatWeekRange(currentWeek.value));
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1>Shopping List</h1>
        <div class="page-subtitle">
          Aggregated ingredients across all selected menu items for {{ weekLabel }}.
        </div>
      </div>
      <WeekPicker v-model="currentWeek" />
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div class="toolbar">
      <RouterLink :to="{ name: 'planner', params: { weekStart: currentWeek } }" class="btn">
        &lt; Back to planner
      </RouterLink>
      <span class="grow" />
      <RouterLink
        :to="{ name: 'print-shopping', params: { weekStart: currentWeek } }"
        class="btn btn-secondary"
        target="_blank"
      >
        Print
      </RouterLink>
    </div>

    <div v-if="loading" class="empty-state">
      <span class="spinner" /> Loading...
    </div>

    <div v-else-if="data" class="card">
      <ShoppingList
        :week-start="currentWeek"
        :aggregated="data.aggregated"
        :breakdown="data.breakdown"
      />
    </div>

    <div v-else class="empty-state muted">Could not load shopping data.</div>
  </section>
</template>
