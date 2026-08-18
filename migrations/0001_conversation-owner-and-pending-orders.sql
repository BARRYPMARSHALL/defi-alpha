-- 0001: conversations get an owner (user_id), pending CoinGate orders persisted.

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_id" varchar;

CREATE TABLE IF NOT EXISTS "pending_orders" (
  "order_id" text PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL,
  "plan" text DEFAULT 'pro' NOT NULL,
  "order_token" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
