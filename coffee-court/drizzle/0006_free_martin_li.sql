CREATE TABLE `notification_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`reference` text NOT NULL,
	`recipient` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `marketing_opt_in` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_registrations` ADD `marketing_opt_in` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `marketing_opt_in` integer DEFAULT 0 NOT NULL;