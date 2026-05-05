-- Shopping ingredients are name-only (no quantities or units in the app)
UPDATE item_shopping_lines SET quantity = NULL, unit = NULL;
