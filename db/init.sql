-- Create application user and grant privileges on `summary`
CREATE DATABASE IF NOT EXISTS `summary` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'app'@'%' IDENTIFIED BY 'app123';
GRANT ALL PRIVILEGES ON `summary`.* TO 'app'@'%';
FLUSH PRIVILEGES;

-- Tables are created by backend AutoMigrate on first start.
-- After backend created tables, you can optionally insert an admin user
-- using the provided instructions in docs/DEPLOY_DOCKER.md.

