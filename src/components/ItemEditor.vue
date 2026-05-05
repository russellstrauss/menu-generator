<script setup lang="ts">
import { ref, watch } from "vue";
import ShoppingItemsEditor from "./ShoppingItemsEditor.vue";
import type { ItemDetail, ShoppingLine } from "../lib/types";

const props = defineProps<{
  open: boolean;
  item: ItemDetail | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", payload: Partial<ItemDetail>): void;
  (e: "delete", id: number): void;
}>();

const name = ref("");
const category = ref("");
const shoppingLines = ref<ShoppingLine[]>([]);
const validationError = ref<string | null>(null);

watch(
  () => [props.open, props.item],
  () => {
    if (!props.open) return;
    name.value = props.item?.name ?? "";
    category.value = props.item?.category ?? "";
    shoppingLines.value = props.item?.shopping_lines
      ? props.item.shopping_lines.map((line) => ({ ...line }))
      : [];
    validationError.value = null;
  },
  { immediate: true }
);

function onSave() {
  validationError.value = null;
  if (!name.value.trim()) {
    validationError.value = "Name is required";
    return;
  }
  emit("save", {
    name: name.value.trim(),
    category: category.value.trim() || null,
    notes: null,
    shopping_lines: shoppingLines.value.filter((l) => l.ingredient.trim()),
  });
}

function onDelete() {
  if (!props.item) return;
  if (!confirm(`Delete "${props.item.name}"? This cannot be undone.`)) return;
  emit("delete", props.item.id);
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>{{ item ? "Edit menu item" : "New menu item" }}</h2>
        <button type="button" class="btn btn-ghost btn-icon" @click="emit('close')" title="Close">x</button>
      </div>
      <div class="modal-body">
        <div v-if="validationError" class="error-banner">{{ validationError }}</div>
        <div class="form-grid">
          <div class="form-row">
            <label for="item-name">Name</label>
            <input
              id="item-name"
              v-model="name"
              type="text"
              placeholder="e.g. Macaroni and cheese"
              autofocus
            />
          </div>
          <div class="form-row">
            <label for="item-category">Category (optional)</label>
            <input
              id="item-category"
              v-model="category"
              type="text"
              placeholder="e.g. Lunch, Snack, Vegetarian"
              list="item-category-suggestions"
            />
            <datalist id="item-category-suggestions">
              <option value="AM Snack" />
              <option value="Lunch" />
              <option value="PM Snack" />
              <option value="Vegetarian" />
              <option value="Gluten Free" />
            </datalist>
          </div>
          <div class="form-row">
            <label>Shopping list</label>
            <ShoppingItemsEditor v-model="shoppingLines" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button v-if="item" type="button" class="btn btn-danger" :disabled="saving" @click="onDelete">
          Delete
        </button>
        <div style="flex: 1" />
        <button type="button" class="btn" :disabled="saving" @click="emit('close')">Cancel</button>
        <button type="button" class="btn btn-primary" :disabled="saving" @click="onSave">
          <span v-if="saving" class="spinner" />
          {{ saving ? "Saving..." : "Save" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-row {
  display: flex;
  flex-direction: column;
}
</style>
