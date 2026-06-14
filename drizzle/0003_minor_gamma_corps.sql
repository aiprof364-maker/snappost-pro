ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerificationToken` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerificationTokenExpiry` timestamp;