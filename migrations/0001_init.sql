-- Initial schema: items, shopping lines, weekly plans, plan slots

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

CREATE TABLE IF NOT EXISTS item_shopping_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_shopping_item_id ON item_shopping_lines(item_id);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plans_week_start ON weekly_plans(week_start);

CREATE TABLE IF NOT EXISTS plan_slots (
  plan_id INTEGER NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 5),
  slot TEXT NOT NULL CHECK (slot IN ('am_snack', 'lunch', 'pm_snack')),
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  PRIMARY KEY (plan_id, day, slot)
);

CREATE INDEX IF NOT EXISTS idx_plan_slots_item_id ON plan_slots(item_id);
