CREATE TABLE `bins` (
	`id` text PRIMARY KEY NOT NULL,
	`warehouse_id` text NOT NULL,
	`row_code` text NOT NULL,
	`code` text NOT NULL,
	`location_code` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`width` real NOT NULL,
	`height` real NOT NULL,
	`capacity` integer NOT NULL,
	`access_node` text NOT NULL,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bins_location_code_unique` ON `bins` (`location_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bins_location_code` ON `bins` (`location_code`);--> statement-breakpoint
CREATE TABLE `warehouse_graph_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`warehouse_id` text NOT NULL,
	`from_node` text NOT NULL,
	`to_node` text NOT NULL,
	`distance` real NOT NULL,
	`bidirectional` integer DEFAULT true NOT NULL,
	`blocked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouse_graph_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`warehouse_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`node_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`pick_task_item_id` text NOT NULL,
	`product_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`bin_id` text NOT NULL,
	`employee_code` text NOT NULL,
	`resolution` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`bin_id` text NOT NULL,
	`quantity_on_hand` integer NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bin_id`) REFERENCES `bins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_product_bin` ON `inventory_locations` (`product_id`,`bin_id`);--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`inventory_location_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_location_id`) REFERENCES `inventory_locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`customer_name` text NOT NULL,
	`status` text NOT NULL,
	`warehouse_id` text,
	`total_paise` integer NOT NULL,
	`allocation_reason` text,
	`is_simulated` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE TABLE `pick_task_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pick_task_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`inventory_location_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`quantity` integer NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`pick_task_id`) REFERENCES `pick_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_location_id`) REFERENCES `inventory_locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pick_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`order_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`employee_code` text,
	`status` text NOT NULL,
	`route_json` text NOT NULL,
	`total_distance` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pick_tasks_code_unique` ON `pick_tasks` (`code`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`barcode` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price_paise` integer NOT NULL,
	`reorder_point` integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_products_sku` ON `products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_products_barcode` ON `products` (`barcode`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`source_bin_id` text,
	`destination_bin_id` text,
	`quantity` integer NOT NULL,
	`movement_type` text NOT NULL,
	`order_id` text,
	`employee_code` text,
	`reference_id` text NOT NULL,
	`created_at` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`status` text NOT NULL,
	`checkin_code` text NOT NULL,
	`load_percent` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_code_unique` ON `warehouses` (`code`);