CREATE TABLE `dailies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`habitica_id` text,
	`title` text NOT NULL,
	`notes` text,
	`difficulty` text DEFAULT 'easy' NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`repeat_days` text,
	`start_date` integer,
	`streak` integer DEFAULT 0 NOT NULL,
	`completed_today` integer DEFAULT false NOT NULL,
	`last_completed_at` integer,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dailies_habitica_id_unique` ON `dailies` (`habitica_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dailies_habitica_id_idx` ON `dailies` (`habitica_id`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`habitica_id` text,
	`title` text NOT NULL,
	`notes` text,
	`difficulty` text DEFAULT 'easy' NOT NULL,
	`counter_up` integer DEFAULT 0 NOT NULL,
	`counter_down` integer DEFAULT 0 NOT NULL,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habits_habitica_id_unique` ON `habits` (`habitica_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `habits_habitica_id_idx` ON `habits` (`habitica_id`);