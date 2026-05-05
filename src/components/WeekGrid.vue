<script setup lang="ts">
import ItemPicker from "./ItemPicker.vue";
import { DAY_LABELS_LONG, SLOTS, type SlotKey } from "../lib/dates";
import type { ItemSummary } from "../lib/types";

defineProps<{
  slotMap: Record<number, Record<SlotKey, number | null>>;
  items: ItemSummary[];
}>();

const emit = defineEmits<{
  (e: "change", payload: { day: number; slot: SlotKey; itemId: number | null }): void;
}>();

function onChange(day: number, slot: SlotKey, itemId: number | null) {
  emit("change", { day, slot, itemId });
}
</script>

<template>
  <div class="week-grid">
    <div class="grid-corner">&nbsp;</div>
    <div v-for="slot in SLOTS" :key="slot.key" class="slot-header">
      {{ slot.label }}
    </div>

    <template v-for="day in 5" :key="day">
      <div class="day-header">{{ DAY_LABELS_LONG[day - 1] }}</div>
      <div v-for="slot in SLOTS" :key="slot.key" class="slot-cell">
        <ItemPicker
          :model-value="slotMap[day]?.[slot.key] ?? null"
          :items="items"
          :placeholder="`Pick ${slot.label.toLowerCase()}...`"
          @update:modelValue="(id) => onChange(day, slot.key, id)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.week-grid {
  display: grid;
  grid-template-columns: minmax(96px, 128px) repeat(3, 1fr);
  gap: 8px;
  align-items: stretch;
}
.grid-corner {
  /* spacer */
}
.slot-header {
  text-align: center;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--color-primary-dark);
  padding: 6px 4px;
  border-bottom: 2px solid var(--color-primary);
  align-self: end;
}
.day-header {
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--color-primary-dark);
  align-self: center;
  padding: 8px 4px 8px 0;
  border-right: 2px solid var(--color-primary);
  text-align: right;
}
.slot-cell {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 6px;
  min-height: 50px;
  display: flex;
  align-items: stretch;
}
.slot-cell > * {
  flex: 1;
}

@media (max-width: 800px) {
  .week-grid {
    grid-template-columns: minmax(72px, 88px) repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .slot-header {
    font-size: 13px;
    padding: 4px 2px;
  }
  .day-header {
    font-size: 13px;
    padding: 6px 2px 6px 0;
  }
}
</style>
