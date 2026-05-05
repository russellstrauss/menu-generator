<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { snapToMonday, todayMondayIso } from "./lib/dates";

const route = useRoute();
const isPrintLayout = computed(() => route.meta.layout === "print");

/** Week shown in Planner / Shopping / Print links — matches URL when present so lists are not “empty” on the wrong week. */
const navWeekStart = computed(() => {
  const raw = route.params.weekStart;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return snapToMonday(raw);
  }
  return todayMondayIso();
});
</script>

<template>
  <div :class="['app-root', { 'app-root--print': isPrintLayout }]">
    <header v-if="!isPrintLayout" class="app-header">
      <div class="brand">
        <img src="/favicon.svg" alt="Marigolds and Cosmos logo" class="brand-logo" />
        <div class="brand-text">
          <div class="brand-title">Marigolds &amp; Cosmos</div>
          <div class="brand-subtitle">Menu Generator</div>
        </div>
      </div>
      <nav class="app-nav">
        <RouterLink :to="{ name: 'planner', params: { weekStart: navWeekStart } }">Planner</RouterLink>
        <RouterLink :to="{ name: 'items' }">Recipe Book</RouterLink>
        <RouterLink :to="{ name: 'shopping', params: { weekStart: navWeekStart } }">Shopping List</RouterLink>
      </nav>
    </header>
    <main :class="['app-main', { 'app-main--print': isPrintLayout }]">
      <RouterView />
    </main>
  </div>
</template>
