CREATE TABLE `preview_daily_usage` (
	`day` varchar(10) NOT NULL,
	`count` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `preview_daily_usage_day` PRIMARY KEY(`day`)
);
--> statement-breakpoint
ALTER TABLE `conversion_events` MODIFY COLUMN `userId` int;