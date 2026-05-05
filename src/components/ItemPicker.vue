<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { ItemSummary } from "../lib/types";

const props = defineProps<{
  modelValue: number | null;
  items: ItemSummary[];
  placeholder?: string;
}>();
const emit = defineEmits<{ (e: "update:modelValue", id: number | null): void }>();

const open = ref(false);
const query = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
/** Keyboard-highlighted row (orange); Enter selects this item. */
const highlightIndex = ref(0);
const optionRowPrefix = `picker-opt-${Math.random().toString(36).slice(2, 9)}`;

const selectedItem = computed(() =>
  props.modelValue ? props.items.find((i) => i.id === props.modelValue) ?? null : null
);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.items.slice(0, 50);
  return props.items
    .filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
    )
    .slice(0, 50);
});

watch(query, () => {
  if (open.value) highlightIndex.value = 0;
});

watch(filtered, (list) => {
  if (highlightIndex.value >= list.length) {
    highlightIndex.value = list.length > 0 ? list.length - 1 : 0;
  }
});

watch(highlightIndex, () => {
  if (!open.value) return;
  nextTick(() => {
    document
      .getElementById(`${optionRowPrefix}-${highlightIndex.value}`)
      ?.scrollIntoView({ block: "nearest" });
  });
});

function pick(id: number | null) {
  emit("update:modelValue", id);
  open.value = false;
  query.value = "";
}

async function toggle() {
  open.value = !open.value;
  if (open.value) {
    query.value = "";
    highlightIndex.value = 0;
    await nextTick();
    searchInput.value?.focus();
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  if (!open.value) return;
  const list = filtered.value;
  if (e.key === "Enter") {
    e.preventDefault();
    const item = list[highlightIndex.value];
    if (item) pick(item.id);
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (list.length === 0) return;
    highlightIndex.value = (highlightIndex.value + 1) % list.length;
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (list.length === 0) return;
    highlightIndex.value = (highlightIndex.value - 1 + list.length) % list.length;
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    open.value = false;
  }
}

function onBlur(ev: FocusEvent) {
  const next = ev.relatedTarget as HTMLElement | null;
  if (next && next.closest(".item-picker")) return;
  open.value = false;
}
</script>

<template>
  <div class="item-picker" @focusout="onBlur" tabindex="-1">
    <button type="button" class="picker-trigger" @click="toggle">
      <span v-if="selectedItem" class="picked">{{ selectedItem.name }}</span>
      <span v-else class="placeholder">{{ placeholder ?? "" }}</span>
      <span class="chev" aria-hidden>v</span>
    </button>
    <button
      v-if="selectedItem"
      type="button"
      class="clear"
      title="Clear"
      @click.stop="pick(null)"
    >
      x
    </button>

    <div v-if="open" class="picker-popover">
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        placeholder="Search items..."
        class="picker-search"
        @keydown="onSearchKeydown"
      />
      <ul class="picker-list">
        <li v-if="filtered.length === 0" class="empty">No matches</li>
        <li
          v-for="(item, index) in filtered"
          :id="`${optionRowPrefix}-${index}`"
          :key="item.id"
          :class="['picker-option', { highlighted: index === highlightIndex }]"
          @mouseenter="highlightIndex = index"
        >
          <button type="button" @click="pick(item.id)">
            <span>{{ item.name }}</span>
            <span v-if="item.category" class="tag">{{ item.category }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.item-picker {
  position: relative;
  display: flex;
  gap: 4px;
  align-items: center;
}
.picker-trigger {
  flex: 1;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font: inherit;
  color: inherit;
  min-height: 34px;
}
.picker-trigger:hover {
  border-color: var(--color-primary);
}
.picked {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.placeholder {
  color: var(--color-muted);
  font-style: italic;
}
.chev {
  color: var(--color-muted);
  font-size: 11px;
}
.clear {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-muted);
  padding: 4px 6px;
  border-radius: 4px;
}
.clear:hover {
  background: var(--color-surface-alt);
  color: var(--color-danger);
}
.picker-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  z-index: 5;
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow: hidden;
}
.picker-search {
  margin: 8px;
  width: calc(100% - 16px);
}
.picker-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}
.picker-list .empty {
  padding: 10px 14px;
  color: var(--color-muted);
  font-size: 13px;
}
.picker-option button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}
.picker-option button:hover {
  background: var(--color-surface-alt);
}
.picker-option.highlighted button {
  background: var(--color-primary);
  color: white;
}
.picker-option.highlighted .tag {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}
</style>
