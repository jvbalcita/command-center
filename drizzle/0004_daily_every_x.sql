ALTER TABLE `dailies` ADD `every_x` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `dailies` ADD `days_of_month` text;--> statement-breakpoint
ALTER TABLE `dailies` ADD `weeks_of_month` text;