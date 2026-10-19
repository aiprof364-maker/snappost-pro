CREATE TABLE `preview_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`landing` varchar(32),
	`originalImageKey` varchar(256) NOT NULL,
	`originalImageUrl` varchar(512) NOT NULL,
	`logoImageKey` varchar(256) NOT NULL,
	`brandedImageKey` varchar(256) NOT NULL,
	`brandedImageUrl` varchar(512) NOT NULL,
	`caption` text NOT NULL,
	`emailRequestedAt` timestamp,
	`userId` int,
	`postId` int,
	`claimedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preview_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `preview_drafts_token_hash_uq` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `preview_drafts_expiry_idx` ON `preview_drafts` (`expiresAt`);