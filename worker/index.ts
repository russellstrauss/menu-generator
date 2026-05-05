import { Hono } from "hono";

type Env = {
  Bindings: {
    DB: D1Database;
    ASSETS: Fetcher;
  };
};

const SLOT_KEYS = ["am_snack", "lunch", "pm_snack"] as const;
type SlotKey = (typeof SLOT_KEYS)[number];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isMonday(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  // Construct as UTC to avoid timezone drift; getUTCDay 1=Monday
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCDay() === 1;
}

const app = new Hono<Env>();

app.onError((err, c) => {
  console.error("Worker error:", err);
  return c.json({ error: err.message ?? "Internal error" }, 500);
});

// Health
app.get("/api/health", (c) => c.json({ ok: true }));

// ----- Items -----

type ShoppingLineInput = {
  ingredient: string;
  quantity: number | null;
  unit: string | null;
};

type ItemInput = {
  name: string;
  category: string | null;
  notes: string | null;
  shopping_lines: ShoppingLineInput[];
};

function validateItemInput(body: unknown): ItemInput | string {
  if (!body || typeof body !== "object") return "Body must be an object";
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim()) return "name is required";
  const lines = Array.isArray(b.shopping_lines) ? b.shopping_lines : [];
  const cleaned: ShoppingLineInput[] = [];
  for (const raw of lines) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const ingredient = typeof r.ingredient === "string" ? r.ingredient.trim() : "";
    if (!ingredient) continue;
    cleaned.push({ ingredient, quantity: null, unit: null });
  }
  return {
    name: b.name.trim(),
    category: typeof b.category === "string" && b.category.trim() ? b.category.trim() : null,
    notes: typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null,
    shopping_lines: cleaned,
  };
}

async function loadItem(db: D1Database, id: number) {
  const item = await db
    .prepare("SELECT id, name, category, notes, created_at, updated_at FROM items WHERE id = ?")
    .bind(id)
    .first();
  if (!item) return null;
  const lines = await db
    .prepare(
      "SELECT id, ingredient, quantity, unit, sort_order FROM item_shopping_lines WHERE item_id = ? ORDER BY sort_order, id"
    )
    .bind(id)
    .all();
  return { ...item, shopping_lines: lines.results ?? [] };
}

app.get("/api/items", async (c) => {
  const search = c.req.query("q");
  let result;
  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    result = await c.env.DB
      .prepare(
        "SELECT id, name, category, notes, updated_at FROM items WHERE name LIKE ? OR category LIKE ? ORDER BY name COLLATE NOCASE"
      )
      .bind(like, like)
      .all();
  } else {
    result = await c.env.DB
      .prepare(
        "SELECT id, name, category, notes, updated_at FROM items ORDER BY name COLLATE NOCASE"
      )
      .all();
  }
  return c.json({ items: result.results ?? [] });
});

app.get("/api/items/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "Invalid id" }, 400);
  const item = await loadItem(c.env.DB, id);
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ item });
});

app.post("/api/items", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = validateItemInput(body);
  if (typeof parsed === "string") return c.json({ error: parsed }, 400);

  const insert = await c.env.DB
    .prepare(
      "INSERT INTO items (name, category, notes) VALUES (?, ?, ?) RETURNING id"
    )
    .bind(parsed.name, parsed.category, parsed.notes)
    .first<{ id: number }>();
  if (!insert) return c.json({ error: "Insert failed" }, 500);

  if (parsed.shopping_lines.length > 0) {
    const stmts = parsed.shopping_lines.map((line, idx) =>
      c.env.DB
        .prepare(
          "INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(insert.id, line.ingredient, line.quantity, line.unit, idx)
    );
    await c.env.DB.batch(stmts);
  }

  const item = await loadItem(c.env.DB, insert.id);
  return c.json({ item }, 201);
});

app.put("/api/items/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "Invalid id" }, 400);
  const body = await c.req.json().catch(() => null);
  const parsed = validateItemInput(body);
  if (typeof parsed === "string") return c.json({ error: parsed }, 400);

  const exists = await c.env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(id).first();
  if (!exists) return c.json({ error: "Not found" }, 404);

  const stmts = [
    c.env.DB
      .prepare(
        "UPDATE items SET name = ?, category = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(parsed.name, parsed.category, parsed.notes, id),
    c.env.DB.prepare("DELETE FROM item_shopping_lines WHERE item_id = ?").bind(id),
    ...parsed.shopping_lines.map((line, idx) =>
      c.env.DB
        .prepare(
          "INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(id, line.ingredient, line.quantity, line.unit, idx)
    ),
  ];
  await c.env.DB.batch(stmts);

  const item = await loadItem(c.env.DB, id);
  return c.json({ item });
});

app.delete("/api/items/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: "Invalid id" }, 400);
  const result = await c.env.DB.prepare("DELETE FROM items WHERE id = ?").bind(id).run();
  if (!result.success) return c.json({ error: "Delete failed" }, 500);
  return c.json({ ok: true });
});

// ----- Weekly plans -----

type PlanSlotRow = {
  day: number;
  slot: SlotKey;
  item_id: number | null;
  item_name: string | null;
  item_category: string | null;
};

const MAX_PRIORITY_ITEMS = 100;

async function loadPriorityItemIds(db: D1Database, planId: number): Promise<number[]> {
  const rows = await db
    .prepare(
      "SELECT item_id FROM plan_priority_items WHERE plan_id = ? ORDER BY sort_order, item_id"
    )
    .bind(planId)
    .all<{ item_id: number }>();
  return (rows.results ?? []).map((r) => r.item_id);
}

/** Validates and dedupes; returns only item ids that exist in `items`. */
async function resolvePriorityItemIds(db: D1Database, raw: unknown): Promise<number[] | string> {
  if (raw === undefined) return "unset";
  if (!Array.isArray(raw)) return "priority_item_ids must be an array";
  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const v of raw) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n <= 0) return "priority_item_ids must be positive integers";
    if (seen.has(n)) continue;
    seen.add(n);
    ordered.push(n);
    if (ordered.length > MAX_PRIORITY_ITEMS) return `At most ${MAX_PRIORITY_ITEMS} priority items`;
  }
  if (ordered.length === 0) return [];
  const ph = ordered.map(() => "?").join(",");
  const found = await db
    .prepare(`SELECT id FROM items WHERE id IN (${ph})`)
    .bind(...ordered)
    .all<{ id: number }>();
  const idset = new Set((found.results ?? []).map((r) => r.id));
  return ordered.filter((id) => idset.has(id));
}

async function getOrCreatePlan(db: D1Database, weekStart: string): Promise<number> {
  const existing = await db
    .prepare("SELECT id FROM weekly_plans WHERE week_start = ?")
    .bind(weekStart)
    .first<{ id: number }>();
  if (existing) return existing.id;
  const inserted = await db
    .prepare("INSERT INTO weekly_plans (week_start) VALUES (?) RETURNING id")
    .bind(weekStart)
    .first<{ id: number }>();
  if (!inserted) throw new Error("Failed to create plan");
  return inserted.id;
}

async function loadPlan(db: D1Database, weekStart: string) {
  const planId = await getOrCreatePlan(db, weekStart);
  const planRow = await db
    .prepare(
      "SELECT id, week_start, notes, created_at, updated_at FROM weekly_plans WHERE id = ?"
    )
    .bind(planId)
    .first();
  const slots = await db
    .prepare(
      `SELECT ps.day, ps.slot, ps.item_id, i.name AS item_name, i.category AS item_category
       FROM plan_slots ps
       LEFT JOIN items i ON i.id = ps.item_id
       WHERE ps.plan_id = ?`
    )
    .bind(planId)
    .all<PlanSlotRow>();
  const priority_item_ids = await loadPriorityItemIds(db, planId);
  return { plan: planRow, slots: slots.results ?? [], priority_item_ids };
}

app.get("/api/plans/:weekStart", async (c) => {
  const weekStart = c.req.param("weekStart");
  if (!isMonday(weekStart)) return c.json({ error: "weekStart must be a Monday in YYYY-MM-DD" }, 400);
  const data = await loadPlan(c.env.DB, weekStart);
  return c.json(data);
});

type PlanUpsertBody = {
  notes?: string | null;
  slots?: { day: number; slot: SlotKey; item_id: number | null }[];
  priority_item_ids?: number[];
};

app.put("/api/plans/:weekStart", async (c) => {
  const weekStart = c.req.param("weekStart");
  if (!isMonday(weekStart)) return c.json({ error: "weekStart must be a Monday in YYYY-MM-DD" }, 400);
  const body = (await c.req.json().catch(() => null)) as PlanUpsertBody | null;
  if (!body) return c.json({ error: "Invalid body" }, 400);

  const planId = await getOrCreatePlan(c.env.DB, weekStart);

  const slots = Array.isArray(body.slots) ? body.slots : [];
  const valid = slots.filter(
    (s) =>
      Number.isInteger(s.day) &&
      s.day >= 1 &&
      s.day <= 5 &&
      SLOT_KEYS.includes(s.slot) &&
      (s.item_id === null || (Number.isInteger(s.item_id) && (s.item_id as number) > 0))
  );

  const stmts = [
    c.env.DB
      .prepare(
        "UPDATE weekly_plans SET notes = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(body.notes ?? null, planId),
    c.env.DB.prepare("DELETE FROM plan_slots WHERE plan_id = ?").bind(planId),
    ...valid
      .filter((s) => s.item_id !== null)
      .map((s) =>
        c.env.DB
          .prepare(
            "INSERT INTO plan_slots (plan_id, day, slot, item_id) VALUES (?, ?, ?, ?)"
          )
          .bind(planId, s.day, s.slot, s.item_id)
      ),
  ];
  await c.env.DB.batch(stmts);

  const data = await loadPlan(c.env.DB, weekStart);
  return c.json(data);
});

app.get("/api/plans/:weekStart/shopping-list", async (c) => {
  const weekStart = c.req.param("weekStart");
  if (!isMonday(weekStart)) return c.json({ error: "weekStart must be a Monday in YYYY-MM-DD" }, 400);

  const planId = await getOrCreatePlan(c.env.DB, weekStart);

  const aggregated = await c.env.DB
    .prepare(
      `SELECT
         LOWER(TRIM(sl.ingredient)) AS key,
         MIN(sl.ingredient) AS ingredient
       FROM plan_slots ps
       JOIN item_shopping_lines sl ON sl.item_id = ps.item_id
       WHERE ps.plan_id = ?
       GROUP BY LOWER(TRIM(sl.ingredient))
       ORDER BY ingredient COLLATE NOCASE`
    )
    .bind(planId)
    .all();

  const breakdown = await c.env.DB
    .prepare(
      `SELECT
         ps.day,
         ps.slot,
         i.id AS item_id,
         i.name AS item_name,
         sl.ingredient
       FROM plan_slots ps
       JOIN items i ON i.id = ps.item_id
       LEFT JOIN item_shopping_lines sl ON sl.item_id = i.id
       WHERE ps.plan_id = ?
       ORDER BY ps.day, ps.slot, sl.sort_order`
    )
    .bind(planId)
    .all();

  return c.json({
    week_start: weekStart,
    aggregated: aggregated.results ?? [],
    breakdown: breakdown.results ?? [],
  });
});

// SPA fallback - delegate to the assets binding
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
