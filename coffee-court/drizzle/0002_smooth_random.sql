CREATE TABLE `realtime_clock` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `products` ADD `variants` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `diet` text DEFAULT 'veg' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `section` text DEFAULT 'Drinks' NOT NULL;