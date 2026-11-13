CREATE TABLE `campaign_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`campaign_title` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`answers` text NOT NULL,
	`field_labels` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`request_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_registrations_request_key_unique` ON `campaign_registrations` (`request_key`);