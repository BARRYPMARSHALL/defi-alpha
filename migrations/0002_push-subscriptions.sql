-- 0002: web push subscriptions (browser notifications).

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "endpoint" text NOT NULL,
  "keys" text NOT NULL,
  "token" text NOT NULL,
  "user_id" varchar,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_unique" ON "push_subscriptions" ("endpoint");
