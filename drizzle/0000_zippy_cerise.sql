CREATE TABLE "accounts" (
	"uid" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"bank" text,
	"name" text,
	"iban" text,
	"currency" text,
	"kind" text,
	"logo" text,
	"balance" double precision,
	"balance_currency" text,
	"balance_updated_at" bigint,
	"connection_id" text,
	"connected_at" bigint,
	"last_synced_at" bigint
);
--> statement-breakpoint
CREATE TABLE "auth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"monthly_limit" double precision NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "budgets_user_id_category_pk" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
CREATE TABLE "category_rules" (
	"user_id" text NOT NULL,
	"match_key" text NOT NULL,
	"category" text NOT NULL,
	"example" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "category_rules_user_id_match_key_pk" PRIMARY KEY("user_id","match_key")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"provider" text,
	"access_token" text,
	"refresh_token" text,
	"expires_at" bigint,
	"connected_at" bigint
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"account_uid" text NOT NULL,
	"booking_date" text,
	"amount" double precision NOT NULL,
	"currency" text,
	"direction" text NOT NULL,
	"description" text,
	"category" text,
	"is_internal" integer DEFAULT 0 NOT NULL,
	"raw" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"image" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_tx_date" ON "transactions" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "idx_tx_user" ON "transactions" USING btree ("user_id");