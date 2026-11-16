DROP INDEX "user_phone_number";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "phone_number";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "phone_number_verified";--> statement-breakpoint
CREATE UNIQUE INDEX "user_username" ON "user" ("username");