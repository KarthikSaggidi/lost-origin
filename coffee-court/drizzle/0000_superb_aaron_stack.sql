CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`court` text NOT NULL,
	`date` text NOT NULL,
	`slot` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `court_date_slot` ON `booking_slots` (`court`,`date`,`slot`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`customer` text NOT NULL,
	`phone` text NOT NULL,
	`court` text NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`duration` integer NOT NULL,
	`players` integer NOT NULL,
	`equipment` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`request_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_request_key_unique` ON `bookings` (`request_key`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` integer NOT NULL,
	`reorder` integer NOT NULL,
	`cost` integer NOT NULL,
	CONSTRAINT "nonnegative_stock" CHECK("inventory"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE `journals` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`description` text NOT NULL,
	`lines` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer` text NOT NULL,
	`phone` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`payment_mode` text NOT NULL,
	`payment_status` text NOT NULL,
	`total` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tax` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`items` text NOT NULL,
	`pickup_at` text NOT NULL,
	`created_at` text NOT NULL,
	`request_key` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_key_unique` ON `orders` (`request_key`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`source` text NOT NULL,
	`mode` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`image` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`recipe` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`reference` text NOT NULL,
	`created_at` text NOT NULL
);
