<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  DAY_LABELS_LONG,
  SLOTS,
  addDays,
  formatShort,
  formatWeekRange,
  snapToMonday,
} from "../lib/dates";
import { api } from "../lib/api";
import type { WeeklyPlan } from "../lib/types";

const route = useRoute();
const weekStart = computed(() => snapToMonday(String(route.params.weekStart ?? "")));
const plan = ref<WeeklyPlan | null>(null);
const error = ref<string | null>(null);
const exportError = ref<string | null>(null);
const exporting = ref(false);
const pdfContentEl = ref<HTMLElement | null>(null);

onMounted(async () => {
  try {
    plan.value = await api.getPlan(weekStart.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
});

const weekLabel = computed(() => formatWeekRange(weekStart.value));

const grid = computed(() => {
  const map: Record<number, Record<string, { name: string | null; category: string | null }>> = {};
  for (let day = 1; day <= 5; day++) {
    map[day] = {};
    for (const s of SLOTS) map[day][s.key] = { name: null, category: null };
  }
  if (!plan.value) return map;
  for (const slot of plan.value.slots) {
    if (!map[slot.day]) continue;
    map[slot.day][slot.slot] = {
      name: slot.item_name,
      category: slot.item_category,
    };
  }
  return map;
});

function dayDate(day: number): string {
  return formatShort(addDays(weekStart.value, day - 1));
}

async function exportPdf() {
  if (!pdfContentEl.value || exporting.value) return;
  exportError.value = null;
  exporting.value = true;
  try {
    const canvas = await html2canvas(pdfContentEl.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "letter",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const renderWidth = pageWidth - margin * 2;
    const renderHeight = (canvas.height * renderWidth) / canvas.width;
    const printableHeight = pageHeight - margin * 2;

    let heightLeft = renderHeight;
    let offsetY = margin;

    pdf.addImage(imageData, "PNG", margin, offsetY, renderWidth, renderHeight, undefined, "FAST");
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      offsetY = margin - (renderHeight - heightLeft);
      pdf.addImage(imageData, "PNG", margin, offsetY, renderWidth, renderHeight, undefined, "FAST");
      heightLeft -= printableHeight;
    }

    pdf.save(`weekly-menu-${weekStart.value}.pdf`);
  } catch (err) {
    exportError.value = err instanceof Error ? err.message : "Failed to export PDF";
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="print-page schedule">
    <div ref="pdfContentEl" class="pdf-content">
      <header class="print-header">
        <div class="brand-line">
          <img src="/favicon.svg" alt="" class="brand-logo" />
          <div>
            <div class="brand-name">Marigolds &amp; Cosmos</div>
            <div class="brand-tagline">Weekly Menu</div>
          </div>
        </div>
        <div class="week-line">{{ weekLabel }}</div>
      </header>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <main v-if="plan" class="pdf-main">
        <div v-if="plan.plan?.notes" class="notes">
          <strong>Notes:</strong> {{ plan.plan.notes }}
        </div>

        <table class="schedule-table">
          <thead>
            <tr>
              <th class="corner-col">&nbsp;</th>
              <th v-for="slot in SLOTS" :key="slot.key" class="slot-head">
                {{ slot.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(label, idx) in DAY_LABELS_LONG" :key="idx">
              <th class="day-col">
                <div class="day-name">{{ label }}</div>
                <div class="day-date">{{ dayDate(idx + 1) }}</div>
              </th>
              <td v-for="slot in SLOTS" :key="slot.key">
                <div v-if="grid[idx + 1][slot.key].name" class="meal-name">
                  {{ grid[idx + 1][slot.key].name }}
                </div>
                <div v-else class="meal-empty">&mdash;</div>
              </td>
            </tr>
          </tbody>
        </table>

      </main>
    </div>

    <div v-if="exportError" class="error-banner export-error">{{ exportError }}</div>

    <div class="print-controls">
      <button class="btn btn-primary" :disabled="exporting" @click="exportPdf">
        {{ exporting ? "Exporting..." : "Export weekly menu as PDF" }}
      </button>
      <RouterLink :to="{ name: 'planner', params: { weekStart } }" class="btn">Back</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.print-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 28px;
  background: white;
  color: #2c2a26;
}
.pdf-content {
  min-height: 660px;
  display: flex;
  flex-direction: column;
}
.pdf-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 3px solid var(--color-primary);
  padding-bottom: 12px;
  margin-bottom: 22px;
}
.brand-line {
  display: flex;
  align-items: center;
  gap: 14px;
}
.brand-logo {
  width: 56px;
  height: 56px;
}
.brand-name {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary-dark);
  letter-spacing: 0.3px;
}
.brand-tagline {
  color: var(--color-secondary-dark);
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.week-line {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}
.schedule-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.schedule-table th,
.schedule-table td {
  border: 1px solid var(--color-border);
  padding: 12px 10px;
  vertical-align: top;
}
.schedule-table thead th {
  background: var(--color-surface-alt);
  text-align: center;
}
.corner-col {
  width: 120px;
  background: var(--color-surface-alt);
}
.slot-head {
  font-weight: 600;
  color: var(--color-secondary-dark);
  font-size: 14px;
}
.day-col {
  width: 120px;
  background: var(--color-surface-alt);
  text-align: left;
  vertical-align: middle;
}
.day-name {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--color-primary-dark);
}
.day-date {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}
.meal-name {
  font-weight: 500;
  font-size: 15px;
  line-height: 1.3;
}
.meal-empty {
  color: #c0bcb5;
  text-align: center;
}
.notes {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--color-surface-alt);
  border-left: 4px solid var(--color-primary);
  border-radius: 4px;
  font-size: 14px;
}
.print-controls {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.export-error {
  margin-top: 16px;
}
@media print {
  @page {
    size: letter;
    margin: 0.4in;
  }
  .print-page {
    padding: 0;
    max-width: none;
  }
  .print-controls {
    display: none;
  }
  .schedule-table {
    page-break-inside: avoid;
  }
}
</style>
