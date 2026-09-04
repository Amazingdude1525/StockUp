CREATE TABLE IF NOT EXISTS `staff_access` (
	`code` text PRIMARY KEY NOT NULL,
	`warehouse_code` text NOT NULL,
	`warehouse_pass_hash` text NOT NULL,
	`pin_hash` text NOT NULL,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL
+);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staff_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`staff_code` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`staff_code`) REFERENCES `staff_access`(`code`) ON UPDATE no action ON DELETE cascade
+);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_staff_sessions_expiry` ON `staff_sessions` (`expires_at`);
