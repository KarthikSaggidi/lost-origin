ALTER TABLE `bookings` ADD `source` text DEFAULT 'Legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `pricing` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `checked_in_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `completed_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `refund` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `timeline` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `show_on_pos` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `show_on_website` integer DEFAULT 1 NOT NULL;