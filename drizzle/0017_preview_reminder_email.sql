ALTER TABLE `preview_drafts` ADD `requestedEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `preview_drafts` ADD `reminderTokenHash` varchar(64);--> statement-breakpoint
CREATE INDEX `preview_drafts_requested_email_idx` ON `preview_drafts` (`requestedEmail`,`emailRequestedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `preview_drafts_reminder_token_uq` ON `preview_drafts` (`reminderTokenHash`);--> statement-breakpoint
CREATE TABLE `preview_reminder_opt_out` (
	`email` varchar(320) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `preview_reminder_opt_out_email` PRIMARY KEY(`email`)
);
