-- Per-week prioritized menu item IDs (ordering for auto-generate and picker UX)

CREATE TABLE IF NOT EXISTS plan_priority_items (
  plan_id INTEGER NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (plan_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_priority_items_plan ON plan_priority_items(plan_id);
