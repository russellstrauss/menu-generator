-- Optional starter examples. Safe to delete from migrations folder if you don't want them.
-- Idempotent: only inserts when the items table is empty.

INSERT INTO items (name, category, notes)
SELECT 'Apple slices with sun butter', 'AM Snack', 'Nut-free; use sunflower seed butter'
WHERE NOT EXISTS (SELECT 1 FROM items LIMIT 1);

INSERT INTO items (name, category, notes)
SELECT 'Cheese quesadillas', 'Lunch', 'Whole-wheat tortillas; serve with salsa'
WHERE (SELECT COUNT(*) FROM items) = 1;

INSERT INTO items (name, category, notes)
SELECT 'Veggie pasta with marinara', 'Lunch', 'Add steamed broccoli on the side'
WHERE (SELECT COUNT(*) FROM items) = 2;

INSERT INTO items (name, category, notes)
SELECT 'Cucumber rounds and hummus', 'PM Snack', NULL
WHERE (SELECT COUNT(*) FROM items) = 3;

INSERT INTO items (name, category, notes)
SELECT 'Banana with whole-grain crackers', 'AM Snack', NULL
WHERE (SELECT COUNT(*) FROM items) = 4;

-- Shopping lines for the seed items (matched by name)
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Apples', 6, 'each', 0 FROM items WHERE name = 'Apple slices with sun butter'
  AND NOT EXISTS (SELECT 1 FROM item_shopping_lines WHERE item_id = items.id);
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Sunflower seed butter', 1, 'jar', 1 FROM items WHERE name = 'Apple slices with sun butter'
  AND (SELECT COUNT(*) FROM item_shopping_lines WHERE item_id = items.id) < 2;

INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Whole-wheat tortillas', 12, 'each', 0 FROM items WHERE name = 'Cheese quesadillas'
  AND NOT EXISTS (SELECT 1 FROM item_shopping_lines WHERE item_id = items.id);
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Shredded cheese', 2, 'cup', 1 FROM items WHERE name = 'Cheese quesadillas'
  AND (SELECT COUNT(*) FROM item_shopping_lines WHERE item_id = items.id) < 2;
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Salsa', 1, 'jar', 2 FROM items WHERE name = 'Cheese quesadillas'
  AND (SELECT COUNT(*) FROM item_shopping_lines WHERE item_id = items.id) < 3;

INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Whole-grain pasta', 1, 'lb', 0 FROM items WHERE name = 'Veggie pasta with marinara'
  AND NOT EXISTS (SELECT 1 FROM item_shopping_lines WHERE item_id = items.id);
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Marinara sauce', 1, 'jar', 1 FROM items WHERE name = 'Veggie pasta with marinara'
  AND (SELECT COUNT(*) FROM item_shopping_lines WHERE item_id = items.id) < 2;
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Broccoli florets', 2, 'cup', 2 FROM items WHERE name = 'Veggie pasta with marinara'
  AND (SELECT COUNT(*) FROM item_shopping_lines WHERE item_id = items.id) < 3;

INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Cucumbers', 3, 'each', 0 FROM items WHERE name = 'Cucumber rounds and hummus'
  AND NOT EXISTS (SELECT 1 FROM item_shopping_lines WHERE item_id = items.id);
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Hummus', 1, 'tub', 1 FROM items WHERE name = 'Cucumber rounds and hummus'
  AND (SELECT COUNT(*) FROM item_shopping_lines WHERE item_id = items.id) < 2;

INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Bananas', 8, 'each', 0 FROM items WHERE name = 'Banana with whole-grain crackers'
  AND NOT EXISTS (SELECT 1 FROM item_shopping_lines WHERE item_id = items.id);
INSERT INTO item_shopping_lines (item_id, ingredient, quantity, unit, sort_order)
SELECT id, 'Whole-grain crackers', 1, 'box', 1 FROM items WHERE name = 'Banana with whole-grain crackers'
  AND (SELECT COUNT(*) FROM item_shopping_lines WHERE item_id = items.id) < 2;
