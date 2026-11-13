-- PEN FIGHT - database update (2026-11-13)
-- Import in phpMyAdmin: select your live database (devimran_pen) -> Import -> choose this file -> Go.
-- Safe to run more than once: it only adds what is missing and never deletes data.
SET NAMES utf8mb4;

-- 1) players.grant_coins : coins given by the admin, delivered to the player's phone on its next sync
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'players' AND COLUMN_NAME = 'grant_coins') = 0,
  'ALTER TABLE players ADD COLUMN grant_coins INT NOT NULL DEFAULT 0 AFTER coins', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 2) users.email : account e-mail (login by e-mail, shown in the admin panel)
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email') = 0,
  'ALTER TABLE users ADD COLUMN email VARCHAR(120) NULL AFTER username', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 3) one e-mail = one account (empty/NULL e-mails of old accounts are allowed many times)
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_email') = 0,
  'ALTER TABLE users ADD UNIQUE KEY uq_email (email)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
