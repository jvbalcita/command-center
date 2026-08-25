ALTER TABLE `dailies` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `habits` SET `sort_order` = `id`;--> statement-breakpoint
UPDATE `dailies` SET `sort_order` = `id`;