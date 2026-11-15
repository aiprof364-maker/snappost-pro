CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerUserId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`code` varchar(16) NOT NULL,
	`signupBonusPosts` int NOT NULL DEFAULT 0,
	`paidCreditCents` int NOT NULL DEFAULT 0,
	`paidCreditStatus` enum('pending','qualified','applied','skipped') NOT NULL DEFAULT 'pending',
	`stripeBalanceTransactionId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_referred_uq` UNIQUE(`referredUserId`)
);
--> statement-breakpoint
ALTER TABLE `auth_tokens` ADD `referralCode` varchar(16);--> statement-breakpoint
ALTER TABLE `posts` ADD `markedImageKey` varchar(256);--> statement-breakpoint
ALTER TABLE `posts` ADD `markedImageUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `preview_drafts` ADD `cleanImageKey` varchar(256);--> statement-breakpoint
ALTER TABLE `preview_drafts` ADD `cleanImageUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `bonusFreePosts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referral_code_uq` UNIQUE(`referralCode`);--> statement-breakpoint
CREATE INDEX `referrals_referrer_idx` ON `referrals` (`referrerUserId`);