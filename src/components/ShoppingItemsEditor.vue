<script setup lang="ts">
import { computed } from "vue";
import type { ShoppingLine } from "../lib/types";

const props = defineProps<{
  modelValue: ShoppingLine[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", lines: ShoppingLine[]): void;
}>();

const lines = computed(() => props.modelValue);

function addLine() {
  emit("update:modelValue", [
    ...lines.value,
    { ingredient: "", quantity: null, unit: null },
  ]);
}

function removeLine(index: number) {
  const next = lines.value.slice();
  next.splice(index, 1);
  emit("update:modelValue", next);
}

function updateLine(index: number, patch: Partial<ShoppingLine>) {
  const next = lines.value.slice();
  next[index] = { ...next[index], ...patch };
  emit("update:modelValue", next);
}

function moveLine(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= lines.value.length) return;
  const next = lines.value.slice();
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  emit("update:modelValue", next);
}
</script>

<template>
  <div class="shopping-editor">
    <div v-if="lines.length === 0" class="empty-state-inline">
      No ingredients yet. Add one below.
    </div>
    <div
      v-for="(line, index) in lines"
      :key="index"
      class="shopping-row"
    >
      <div class="reorder">
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          :disabled="index === 0"
          @click="moveLine(index, -1)"
          title="Move up"
        >
          ^
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          :disabled="index === lines.length - 1"
          @click="moveLine(index, 1)"
          title="Move down"
        >
          v
        </button>
      </div>
      <input
        type="text"
        class="ingredient"
        placeholder="Ingredient (e.g. Apples)"
        :value="line.ingredient"
        @input="(ev) => updateLine(index, { ingredient: (ev.target as HTMLInputElement).value })"
      />
      <button type="button" class="btn btn-ghost btn-icon" @click="removeLine(index)" title="Remove">
        x
      </button>
    </div>
    <button type="button" class="btn btn-sm" @click="addLine">+ Add ingredient</button>
  </div>
</template>

<style scoped>
.shopping-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shopping-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 6px;
  align-items: center;
}
.reorder {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.reorder .btn {
  font-size: 12px;
  padding: 2px 6px;
  line-height: 1;
}
.empty-state-inline {
  color: var(--color-muted);
  font-size: 13px;
  padding: 8px 0;
}
</style>
