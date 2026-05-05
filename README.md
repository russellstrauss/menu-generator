# Marigolds & Cosmos - Menu Generator

A small web app for planning weekly school menus. Build a library of menu items
(each with its own shopping list), drag them into Mon-Fri AM Snack / Lunch /
PM Snack slots for the week, and generate printable schedules for families
plus aggregated shopping lists for staff.

- **Frontend**: Vue 3 + Vite (Composition API, Pinia, Vue Router)
- **Backend**: [Hono](https://hono.dev/) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Single Worker that serves both static assets and the `/api/*` routes
- **Auth**: None - the URL itself is the share link

## Project layout

```
src/                        Vue app
  views/                    Routed views (Items, Planner, Shopping, Print*)
  components/               WeekGrid, ItemPicker, ShoppingList, etc.
  stores/                   Pinia stores (items, plans)
  lib/                      api client, date helpers, shared types
  styles/main.css           App-wide styles + print rules
worker/index.ts             Hono routes
migrations/                 D1 schema migrations
wrangler.jsonc              Worker + D1 binding configuration
vite.config.ts              Vite + @cloudflare/vite-plugin
```

## One-time setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Authenticate Wrangler if you haven't:
   ```bash
   npx wrangler login
   ```
3. Create a D1 database and copy the printed `database_id` into `wrangler.jsonc`
   (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`):
   ```bash
   npm run db:create
   ```
4. Apply migrations locally and remotely:
   ```bash
   npm run db:migrate:local
   npm run db:migrate:remote
   ```
   `migrations/0002_seed_examples.sql` is optional starter data; delete that file
   before running migrations if you don't want it.

## Development

```bash
npm run dev
```

Vite serves the SPA on http://localhost:5173 and the `@cloudflare/vite-plugin`
runs the Worker (Hono + D1) inside `workerd` against your local D1 database, so
both `/` and `/api/*` work in dev. Hot module replacement covers both client
and worker code.

## Deployment

```bash
npm run deploy
```

This runs `vue-tsc`, builds the SPA into `dist/client/`, builds the Worker into
`dist/menu-generator/`, then `wrangler deploy` ships both. After the first
deploy you'll have a public URL like `menu-generator.<account>.workers.dev`.

## Routes

| Path                                   | Description                                                  |
| -------------------------------------- | ------------------------------------------------------------ |
| `/`                                    | Redirects to the planner for the current week (Monday-Fri)   |
| `/items`                               | Items library: CRUD with shopping lists                      |
| `/planner/:weekStart`                  | Weekly planner grid (5 days x 3 slots), auto-saving          |
| `/shopping/:weekStart`                 | Aggregated shopping list with check-off                      |
| `/print/schedule/:weekStart`           | Family-facing printable weekly menu (share this URL)         |
| `/print/shopping/:weekStart`           | Printable shopping list for staff                            |

All `weekStart` values are ISO `YYYY-MM-DD` Mondays; the app snaps any date
clicked in the date picker to the Monday of that week.

## API summary

All API routes return JSON.

- `GET /api/items` (optional `?q=` search) -> `{ items: [...] }`
- `GET /api/items/:id` -> `{ item: { ..., shopping_lines: [...] } }`
- `POST /api/items` -> create with embedded `shopping_lines`
- `PUT /api/items/:id` -> replace item + shopping lines transactionally
- `DELETE /api/items/:id`
- `GET /api/plans/:weekStart` -> creates an empty plan if missing
- `PUT /api/plans/:weekStart` -> upsert all 15 slots + notes
- `GET /api/plans/:weekStart/shopping-list` -> aggregated + breakdown

## Data model

```
items (id, name, category, notes, created_at, updated_at)
item_shopping_lines (id, item_id, ingredient, quantity, unit, sort_order)
weekly_plans (id, week_start UNIQUE, notes, created_at, updated_at)
plan_slots (plan_id, day 1..5, slot 'am_snack'|'lunch'|'pm_snack', item_id)
```

The shopping list aggregates lines across all `plan_slots` for a week:

```sql
SELECT LOWER(TRIM(sl.ingredient)) AS key,
       MIN(sl.ingredient) AS ingredient,
       COALESCE(sl.unit, '') AS unit,
       SUM(COALESCE(sl.quantity, 0)) AS total_quantity,
       SUM(CASE WHEN sl.quantity IS NULL THEN 1 ELSE 0 END) AS unmeasured_count
FROM plan_slots ps
JOIN item_shopping_lines sl ON sl.item_id = ps.item_id
WHERE ps.plan_id = ?
GROUP BY key, COALESCE(sl.unit, '');
```

Lines without a quantity are reported as "as needed (N items)". Identical
ingredients with different units are kept separate so totals stay meaningful.

## Notes

- The planner auto-saves ~700ms after the last edit. The save indicator in the
  toolbar shows progress.
- Local check-off state on the shopping list is stored per-week in the
  browser's `localStorage` so different staff members keep their own progress.
- Print views use `@media print { ... }` rules and respond to the browser's
  Print command (Ctrl/Cmd+P) - "Save as PDF" produces a clean handout.
- There is no authentication; treat the deployed URL as effectively private
  by sharing it only with staff. Add Cloudflare Access in front of it later if
  you need login gating.
