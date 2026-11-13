CREATE TABLE `operation_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`verified` integer NOT NULL,
	CONSTRAINT "unchanged_record" CHECK("operation_guards"."verified" = 1)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `version` integer DEFAULT 0 NOT NULL;