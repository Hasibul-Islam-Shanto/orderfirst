-- Seed initial restaurant tables
INSERT INTO "booking"."RestaurantTable" ("id", "tableNumber", "capacity", "isAvailable", "createdAt", "updatedAt")
VALUES
  ('30000000-0000-0000-0000-000000000001', 1, 2, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002', 2, 2, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000003', 3, 4, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000004', 4, 4, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000005', 5, 4, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000006', 6, 6, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000007', 7, 6, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000008', 8, 8, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000009', 9, 2, true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000010', 10, 4, true, NOW(), NOW())
ON CONFLICT ("tableNumber") DO NOTHING;

