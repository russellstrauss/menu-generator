<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useItemsStore } from "../stores/items";
import ItemEditor from "../components/ItemEditor.vue";
import type { ItemDetail } from "../lib/types";

const store = useItemsStore();
const search = ref("");
const editorOpen = ref(false);
const editing = ref<ItemDetail | null>(null);
const saving = ref(false);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return store.items;
  return store.items.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      (i.category ?? "").toLowerCase().includes(q)
  );
});

onMounted(() => {
  store.refresh();
});

function openNew() {
  editing.value = null;
  editorOpen.value = true;
}

async function openEdit(id: number) {
  try {
    const detail = await store.fetchDetail(id);
    editing.value = detail;
    editorOpen.value = true;
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  }
}

async function onSave(payload: Partial<ItemDetail>) {
  saving.value = true;
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload);
    } else {
      await store.create(payload);
    }
    editorOpen.value = false;
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  } finally {
    saving.value = false;
  }
}

async function onDelete(id: number) {
  saving.value = true;
  try {
    await store.remove(id);
    editorOpen.value = false;
  } catch (err) {
    alert(err instanceof Error ? err.message : String(err));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1>Recipe Book</h1>
        <div class="page-subtitle">
          Reusable building blocks: each item has its own shopping list.
        </div>
      </div>
      <button class="btn btn-primary" @click="openNew">+ New recipe</button>
    </div>

    <div v-if="store.error" class="error-banner">{{ store.error }}</div>

    <div class="toolbar">
      <input
        type="search"
        class="grow"
        placeholder="Search by name or category..."
        v-model="search"
      />
      <span class="muted">{{ filtered.length }} recipe{{ filtered.length === 1 ? "" : "s" }}</span>
    </div>

    <div v-if="store.loading && store.items.length === 0" class="empty-state">
      <span class="spinner" /> Loading...
    </div>

    <div v-else-if="filtered.length === 0" class="empty-state">
      <p v-if="store.items.length === 0">
        Your recipe book is empty. Start by adding the recipes your school serves most often.
      </p>
      <p v-else>No recipes match "{{ search }}".</p>
      <button v-if="store.items.length === 0" class="btn btn-primary" @click="openNew">
        + Add your first recipe
      </button>
    </div>

    <div v-else class="items-grid">
      <button
        v-for="item in filtered"
        :key="item.id"
        type="button"
        class="item-card"
        @click="openEdit(item.id)"
      >
        <div class="item-card-header">
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.category" class="tag">{{ item.category }}</span>
        </div>
        <div class="item-meta muted">
          <span v-if="item.updated_at">Updated {{ new Date(item.updated_at + "Z").toLocaleDateString() }}</span>
          <span v-else>&nbsp;</span>
          <span class="ingredient-hint">Click to edit shopping list</span>
        </div>
      </button>
    </div>

    <ItemEditor
      :open="editorOpen"
      :item="editing"
      :saving="saving"
      @close="editorOpen = false"
      @save="onSave"
      @delete="onDelete"
    />
  </section>
</template>

<style scoped>
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.item-card {
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.05s;
  font: inherit;
  color: inherit;
}
.item-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow);
}
.item-card:active {
  transform: translateY(1px);
}
.item-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.item-name {
  font-weight: 600;
  font-size: 16px;
}
.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-top: auto;
}
.ingredient-hint {
  color: var(--color-primary-dark);
  font-weight: 500;
}
</style>
