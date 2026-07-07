CREATE TABLE `onboarding_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileCompleted` boolean NOT NULL DEFAULT false,
	`profileCompletedAt` timestamp,
	`facebookConnected` boolean NOT NULL DEFAULT false,
	`facebookConnectedAt` timestamp,
	`firstPostCreated` boolean NOT NULL DEFAULT false,
	`firstPostCreatedAt` timestamp,
	`firstPostPublished` boolean NOT NULL DEFAULT false,
	`firstPostPublishedAt` timestamp,
	`completionPercentage` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_checklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboarding_checklist_userId_unique` UNIQUE(`userId`)
);
