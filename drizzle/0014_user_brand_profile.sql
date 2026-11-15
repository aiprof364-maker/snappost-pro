ALTER TABLE `users` ADD `businessName` varchar(80);--> statement-breakpoint
ALTER TABLE `users` ADD `suburb` varchar(60);--> statement-breakpoint
ALTER TABLE `users` ADD `trade` varchar(60);--> statement-breakpoint
ALTER TABLE `users` ADD `brandSetupSkipped` boolean DEFAULT false NOT NULL;
