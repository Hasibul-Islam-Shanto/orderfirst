-- Enable btree_gist extension globally
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create isolated schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS booking;

-- Allow services to create/manage their schema objects
GRANT CREATE ON DATABASE orderfirst TO auth_user;
GRANT CREATE ON DATABASE orderfirst TO catalog_user;
GRANT CREATE ON DATABASE orderfirst TO orders_user;
GRANT CREATE ON DATABASE orderfirst TO booking_user;

-- Create dedicated roles for each service
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'auth_user') THEN
    CREATE ROLE auth_user LOGIN PASSWORD 'auth_password_123';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'catalog_user') THEN
    CREATE ROLE catalog_user LOGIN PASSWORD 'catalog_password_123';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'orders_user') THEN
    CREATE ROLE orders_user LOGIN PASSWORD 'orders_password_123';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'booking_user') THEN
    CREATE ROLE booking_user LOGIN PASSWORD 'booking_password_123';
  END IF;
END $$;

-- Least-privilege Grants per schema

-- 1. auth_user -> auth schema only
GRANT USAGE, CREATE ON SCHEMA auth TO auth_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO auth_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO auth_user;
REVOKE ALL ON SCHEMA catalog FROM auth_user;
REVOKE ALL ON SCHEMA orders FROM auth_user;
REVOKE ALL ON SCHEMA booking FROM auth_user;

-- 2. catalog_user -> catalog schema only
GRANT USAGE, CREATE ON SCHEMA catalog TO catalog_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalog TO catalog_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA catalog TO catalog_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog GRANT ALL ON TABLES TO catalog_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog GRANT ALL ON SEQUENCES TO catalog_user;
REVOKE ALL ON SCHEMA auth FROM catalog_user;
REVOKE ALL ON SCHEMA orders FROM catalog_user;
REVOKE ALL ON SCHEMA booking FROM catalog_user;

-- 3. orders_user -> orders schema only
GRANT USAGE, CREATE ON SCHEMA orders TO orders_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA orders TO orders_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA orders TO orders_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA orders GRANT ALL ON TABLES TO orders_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA orders GRANT ALL ON SEQUENCES TO orders_user;
REVOKE ALL ON SCHEMA auth FROM orders_user;
REVOKE ALL ON SCHEMA catalog FROM orders_user;
REVOKE ALL ON SCHEMA booking FROM orders_user;

-- 4. booking_user -> booking schema only
GRANT USAGE, CREATE ON SCHEMA booking TO booking_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA booking TO booking_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA booking TO booking_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA booking GRANT ALL ON TABLES TO booking_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA booking GRANT ALL ON SEQUENCES TO booking_user;
REVOKE ALL ON SCHEMA auth FROM booking_user;
REVOKE ALL ON SCHEMA catalog FROM booking_user;
REVOKE ALL ON SCHEMA orders FROM booking_user;

