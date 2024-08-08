CREATE TABLE `tbl_csv_files` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `created_time_utc` datetime NOT NULL COMMENT 'Create Time',
  `file_name` varchar(255) NOT NULL,
  `status` varchar(20) DEFAULT NULL,
  `location` varchar(500) DEFAULT NULL,
  `modified_date_utc` datetime DEFAULT NULL,
  `client_id` varchar(16) NOT NULL,
  `keyword` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci