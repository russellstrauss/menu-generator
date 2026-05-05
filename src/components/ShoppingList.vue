<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import type { AggregatedLine, BreakdownLine } from "../lib/types";

const props = defineProps<{
  weekStart: string;
  aggregated: AggregatedLine[];
  breakdown: BreakdownLine[];
  printable?: boolean;
}>();

const checked = ref<Record<string, boolean>>({});
const storageKey = computed(() => `shopping-checked-${props.weekStart}`);

watch(
  storageKey,
  (key) => {
    try {
      const stored = localStorage.getItem(key);
      checked.value = stored ? JSON.parse(stored) : {};
    } catch {
      checked.value = {};
    }
  },
  { immediate: true }
);

watch(
  checked,
  (val) => {
    try {
      localStorage.setItem(storageKey.value, JSON.stringify(val));
    } catch {
      /* ignore */
    }
  },
  { deep: true }
);

function rowKey(line: AggregatedLine) {
  return line.key;
}

function toggle(key: string) {
  checked.value = { ...checked.value, [key]: !checked.value[key] };
}

const totalLines = computed(() => props.aggregated.length);
const checkedCount = computed(() =>
  props.aggregated.filter((l) => checked.value[rowKey(l)]).length
);

</script>

<template>
  <div class="shopping-list">
    <div v-if="aggregated.length === 0" class="empty-state empty-hint">
      <p>
        Nothing to aggregate yet. The list is built from
        <strong>meals you place on the planner</strong> for this week, using each item’s
        <strong>shopping ingredients</strong> (edited under Recipe Book).
      </p>
      <p v-if="!printable" class="muted small">
        Wrong week? Use the week picker above, or open Planner — header links keep the same week as the page you came from.
      </p>
      <div v-if="!printable" class="empty-actions">
        <RouterLink class="btn btn-primary" :to="{ name: 'planner', params: { weekStart } }">
          Open planner for this week
        </RouterLink>
        <RouterLink class="btn" :to="{ name: 'items' }">Recipe Book</RouterLink>
      </div>
    </div>

    <div v-else>
      <div class="list-header">
        <h2>Aggregated shopping list</h2>
        <span class="muted">{{ checkedCount }} / {{ totalLines }} checked</span>
      </div>

      <ul class="agg-list">
        <li
          v-for="line in aggregated"
          :key="rowKey(line)"
          :class="['agg-row', { checked: checked[rowKey(line)] }]"
        >
          <label class="check-cell">
            <input
              type="checkbox"
              :checked="!!checked[rowKey(line)]"
              @change="toggle(rowKey(line))"
            />
            <span class="ingredient">{{ line.ingredient }}</span>
          </label>
        </li>
      </ul>

    </div>
  </div>
</template>

<style scoped>
.empty-hint p {
  margin: 0 0 10px;
  max-width: 42em;
  line-height: 1.45;
}
.empty-hint .small {
  font-size: 13px;
  margin-bottom: 14px;
}
.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}
.list-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--color-secondary-dark);
}
.agg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.agg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px dashed var(--color-border);
}
.agg-row.checked .ingredient {
  text-decoration: line-through;
  color: var(--color-muted);
}
.check-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: inherit;
}
.check-cell input {
  width: 18px;
  height: 18px;
}
@media print {
  .agg-row {
    page-break-inside: avoid;
  }
  .agg-row.checked .ingredient {
    text-decoration: none;
    color: inherit;
  }
}
</style>
