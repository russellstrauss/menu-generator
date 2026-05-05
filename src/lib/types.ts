import type { SlotKey } from "./dates";

export type ShoppingLine = {
  id?: number;
  ingredient: string;
  /** Kept for API/schema compatibility; always null. */
  quantity?: number | null;
  unit?: string | null;
  sort_order?: number;
};

export type ItemSummary = {
  id: number;
  name: string;
  category: string | null;
  notes: string | null;
  updated_at?: string;
};

export type ItemDetail = ItemSummary & {
  created_at?: string;
  shopping_lines: ShoppingLine[];
};

export type PlanSlot = {
  day: number;
  slot: SlotKey;
  item_id: number | null;
  item_name: string | null;
  item_category: string | null;
};

export type WeeklyPlan = {
  plan: {
    id: number;
    week_start: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  slots: PlanSlot[];
};

export type AggregatedLine = {
  key: string;
  ingredient: string;
};

export type BreakdownLine = {
  day: number;
  slot: SlotKey;
  item_id: number;
  item_name: string;
  ingredient: string | null;
};

export type ShoppingListResponse = {
  week_start: string;
  aggregated: AggregatedLine[];
  breakdown: BreakdownLine[];
};
