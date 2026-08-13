CREATE TABLE `trial_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailHash` varchar(64) NOT NULL,
	`facebookPageId` varchar(128),
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trial_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `trial_claims_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `trial_claims_emailHash_unique` UNIQUE(`emailHash`),
	CONSTRAINT `trial_claims_facebookPageId_unique` UNIQUE(`facebookPageId`),
	CONSTRAINT `trial_claims_stripeCustomerId_unique` UNIQUE(`stripeCustomerId`),
	CONSTRAINT `trial_claims_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`)
);
