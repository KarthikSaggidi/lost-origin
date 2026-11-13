CREATE TABLE `admin_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`reference` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE INDEX `admin_notifications_read_created` ON `admin_notifications` (`read_at`,`created_at`);