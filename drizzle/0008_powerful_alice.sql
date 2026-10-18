CREATE TABLE `account_email_delivery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`recipientEmail` varchar(320),
	`entityKey` varchar(191) NOT NULL,
	`campaignKey` varchar(191) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`availableAt` datetime NOT NULL,
	`nextAttemptAt` datetime,
	`firstAttemptAt` datetime,
	`lastAttemptAt` datetime,
	`acceptedAt` datetime,
	`providerMessageId` varchar(191),
	`lastErrorClass` varchar(32),
	`metadata` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `account_email_delivery_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_email_entity_campaign_uq` UNIQUE(`entityKey`,`campaignKey`)
);
--> statement-breakpoint
CREATE TABLE `account_email_rollout` (
	`rolloutKey` varchar(64) NOT NULL,
	`startedAt` datetime NOT NULL,
	CONSTRAINT `account_email_rollout_rolloutKey` PRIMARY KEY(`rolloutKey`)
);
--> statement-breakpoint
CREATE INDEX `account_email_dispatch_idx` ON `account_email_delivery` (`status`,`nextAttemptAt`);--> statement-breakpoint
CREATE INDEX `account_email_user_idx` ON `account_email_delivery` (`userId`);
