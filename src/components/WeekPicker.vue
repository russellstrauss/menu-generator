<script setup lang="ts">
import { computed } from "vue";
import {
  formatWeekRange,
  nextMonday,
  previousMonday,
  snapToMonday,
  todayMondayIso,
} from "../lib/dates";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();

const range = computed(() => formatWeekRange(props.modelValue));
const isThisWeek = computed(() => props.modelValue === todayMondayIso());

function setWeek(iso: string) {
  emit("update:modelValue", iso);
}

function onDateInput(ev: Event) {
  const value = (ev.target as HTMLInputElement).value;
  if (!value) return;
  setWeek(snapToMonday(value));
}
</script>

<template>
  <div class="week-picker">
    <button class="btn btn-icon" @click="setWeek(previousMonday(modelValue))" title="Previous week">
      &lt;
    </button>
    <div class="week-display">
      <input
        type="date"
        :value="modelValue"
        @change="onDateInput"
        class="date-input"
        title="Pick any date in the week"
      />
      <div class="week-range">
        <strong>{{ range }}</strong>
        <span v-if="isThisWeek" class="this-week-tag">This week</span>
      </div>
    </div>
    <button class="btn btn-icon" @click="setWeek(nextMonday(modelValue))" title="Next week">
      &gt;
    </button>
    <button v-if="!isThisWeek" class="btn btn-sm" @click="setWeek(todayMondayIso())">
      Today
    </button>
  </div>
</template>

<style scoped>
.week-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.week-display {
  display: flex;
  align-items: center;
  gap: 12px;
}
.date-input {
  width: 150px;
}
.week-range {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}
.this-week-tag {
  font-size: 11px;
  color: var(--color-secondary-dark);
  background: #e3f0e2;
  padding: 1px 6px;
  border-radius: 999px;
  align-self: flex-start;
}
</style>
