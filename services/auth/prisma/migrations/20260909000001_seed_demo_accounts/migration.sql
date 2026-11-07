-- Seed Admin and Customer demo accounts documented in README
INSERT INTO "auth"."User" ("id", "name", "email", "passwordHash", "role", "emailVerifiedAt", "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'admin@orderfirst.dev', '$2b$10$N4xaFHIpKLfvVKnqLm3KeeFOesIMwoEhe0KQGQPHgfNh7alKM98fi', 'ADMIN', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Demo Customer', 'customer@orderfirst.dev', '$2b$10$N4xaFHIpKLfvVKnqLm3KeeFOesIMwoEhe0KQGQPHgfNh7alKM98fi', 'CUSTOMER', NOW(), NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;

