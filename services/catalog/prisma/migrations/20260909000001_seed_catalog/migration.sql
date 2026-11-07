-- Seed initial menu categories
INSERT INTO "catalog"."Category" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Starters', 'starters', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', 'Main Course', 'mains', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000003', 'Burgers', 'burgers', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000004', 'Pizza', 'pizza', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000005', 'Pasta', 'pasta', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000006', 'Desserts', 'desserts', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000007', 'Drinks', 'drinks', NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Seed initial menu items
INSERT INTO "catalog"."MenuItem" ("id", "name", "description", "price", "imageUrl", "isAvailable", "isFeatured", "preparationTimeMinutes", "categoryId", "createdAt", "updatedAt")
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'Heirloom Burrata',
    'Creamy burrata, sun-ripened heirloom tomatoes, fresh basil, and a drizzle of extra virgin olive oil.',
    14.00,
    'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=900&q=85',
    true,
    true,
    10,
    '10000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'The House Burger',
    'Flame-grilled beef, aged cheddar, caramelized onions, and our house sauce on a toasted brioche bun.',
    18.00,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    true,
    true,
    20,
    '10000000-0000-0000-0000-000000000003',
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Truffle Tagliatelle',
    'Handmade egg pasta tossed with black winter truffle butter, parmigiano reggiano, and cracked pepper.',
    22.00,
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281292?auto=format&fit=crop&w=900&q=85',
    true,
    true,
    18,
    '10000000-0000-0000-0000-000000000005',
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'Margherita Pizza',
    'San Marzano tomato sauce, fior di latte mozzarella, fresh basil leaves, and sea salt.',
    16.00,
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85',
    true,
    true,
    15,
    '10000000-0000-0000-0000-000000000004',
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'Pan-Seared Atlantic Salmon',
    'Crispy skin salmon served over warm farro salad, charred asparagus, and lemon-dill emulsification.',
    26.00,
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=85',
    true,
    false,
    25,
    '10000000-0000-0000-0000-000000000002',
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    'Classic Tiramisu',
    'Layers of espresso-soaked ladyfingers, velvety mascarpone cream, and Dutch cocoa dusting.',
    9.00,
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=85',
    true,
    false,
    8,
    '10000000-0000-0000-0000-000000000006',
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    'Fresh Mint Lemonade',
    'Freshly squeezed lemon juice, crushed garden mint, agave nectar, and sparkling spring water.',
    6.00,
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=85',
    true,
    false,
    5,
    '10000000-0000-0000-0000-000000000007',
    NOW(),
    NOW()
  )
ON CONFLICT ("id") DO NOTHING;

