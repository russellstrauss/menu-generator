<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ShoppingList from "../components/ShoppingList.vue";
import { formatWeekRange, snapToMonday } from "../lib/dates";
import { api } from "../lib/api";
import type { ShoppingListResponse } from "../lib/types";

const route = useRoute();
const weekStart = computed(() => snapToMonday(String(route.params.weekStart ?? "")));
const data = ref<ShoppingListResponse | null>(null);
const error = ref<string | null>(null);
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const raw = await api.getShoppingList(weekStart.value);
    data.value = {
      week_start: raw.week_start ?? weekStart.value,
      aggregated: Array.isArray(raw.aggregated) ? raw.aggregated : [],
      breakdown: Array.isArray(raw.breakdown) ? raw.breakdown : [],
    };
  } catch (err) {
    data.value = null;
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
});

const weekLabel = computed(() => formatWeekRange(weekStart.value));

function printPage() {
  window.print();
}
</script>

<template>
  <div class="print-page print-shopping">
    <header class="print-header">
      <div class="brand-line">
        <img src="/favicon.svg" alt="" class="brand-logo" />
        <div>
          <div class="brand-name">Marigolds &amp; Cosmos</div>
          <div class="brand-tagline">Weekly Shopping List</div>
        </div>
      </div>
      <div class="week-line">{{ weekLabel }}</div>
    </header>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div v-else-if="loading" class="empty-state">
      <span class="spinner" /> Loading...
    </div>

    <main v-else-if="data">
      <ShoppingList
        :week-start="weekStart"
        :aggregated="data.aggregated"
        :breakdown="data.breakdown"
        printable
      />
    </main>

    <div class="print-controls">
      <button class="btn btn-primary" @click="printPage">Print this page</button>
      <RouterLink :to="{ name: 'shopping', params: { weekStart } }" class="btn">Back</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.print-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 28px;
  background: white;
  color: #2c2a26;
}
.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 3px solid var(--color-primary);
  padding-bottom: 12px;
  margin-bottom: 18px;
}
.brand-line {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-logo {
  width: 44px;
  height: 44px;
}
.brand-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary-dark);
}
.brand-tagline {
  color: var(--color-secondary-dark);
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.week-line {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}
.print-controls {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
@media print {
  .print-controls {
    display: none;
  }
  .print-page {
    padding: 0;
  }
}
</style>
