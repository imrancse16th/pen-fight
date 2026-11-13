-- PEN FIGHT production database. Import once (phpMyAdmin -> database devimran_pen -> Import).
-- If old PEN FIGHT tables already exist (test data only), select all tables -> Drop, then import this file.
SET NAMES utf8mb4;

-- game profile of every player (guests and registered accounts)
CREATE TABLE IF NOT EXISTS players (
  id          CHAR(6)      NOT NULL PRIMARY KEY,
  name        VARCHAR(40)  NOT NULL,
  token       CHAR(32)     NOT NULL,
  data        TEXT         NULL,                -- saved progress (coins, owned pens, stats) as JSON
  banned      TINYINT      NOT NULL DEFAULT 0,  -- 1 = blocked by admin
  gems        INT          NOT NULL DEFAULT 0,
  coins       INT          NOT NULL DEFAULT 500,
  grant_coins INT          NOT NULL DEFAULT 0,   -- coins gifted by an admin, delivered to the phone on its next sync
  created_at  INT UNSIGNED NOT NULL,
  last_seen   INT UNSIGNED NOT NULL,
  KEY idx_name (name),
  KEY idx_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- login accounts of players (username + password). A guest has no row here until he sets a password.
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(30)  NOT NULL,
  email       VARCHAR(120) NULL,
  pass_hash   VARCHAR(100) NOT NULL,
  player_id   CHAR(6)      NOT NULL,
  created_at  INT UNSIGNED NOT NULL,
  last_login  INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_username (username),
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- admin panel accounts (email + password)
CREATE TABLE IF NOT EXISTS admins (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(120) NOT NULL,
  pass_hash   VARCHAR(100) NOT NULL,
  created_at  INT UNSIGNED NOT NULL,
  last_login  INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  player_id   CHAR(6)      NOT NULL,
  kind        VARCHAR(20)  NOT NULL,          -- buy | dummy_pack | admin
  item        VARCHAR(60)  NOT NULL DEFAULT '',
  gems        INT          NOT NULL DEFAULT 0,
  coins       INT          NOT NULL DEFAULT 0,
  created_at  INT UNSIGNED NOT NULL,
  KEY idx_player (player_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- online rooms (internet mode, HTTP relay)
CREATE TABLE IF NOT EXISTS rooms (
  id          CHAR(5)      NOT NULL PRIMARY KEY,
  pass        VARCHAR(12)  NOT NULL DEFAULT '',
  max_players TINYINT      NOT NULL,
  time_sec    SMALLINT     NOT NULL,
  arena       VARCHAR(20)  NOT NULL,
  level       TINYINT      NOT NULL DEFAULT 1,
  started     TINYINT      NOT NULL DEFAULT 0,
  closed      TINYINT      NOT NULL DEFAULT 0,
  snap        MEDIUMTEXT   NULL,               -- latest game snapshot sent by the host
  snap_seq    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  INT UNSIGNED NOT NULL,
  last_seen   INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS room_members (
  room_id     CHAR(5)      NOT NULL,
  idx         TINYINT      NOT NULL,
  name        VARCHAR(40)  NOT NULL,
  pen_id      VARCHAR(20)  NOT NULL DEFAULT 'blue',
  av          VARCHAR(20)  NOT NULL DEFAULT 'boy',
  rt          CHAR(16)     NOT NULL,          -- member secret
  gone        TINYINT      NOT NULL DEFAULT 0,
  last_seen   INT UNSIGNED NOT NULL,
  PRIMARY KEY (room_id, idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS room_msgs (
  seq         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id     CHAR(5)      NOT NULL,
  to_idx      TINYINT      NULL,              -- NULL = everybody except from_idx
  from_idx    TINYINT      NOT NULL DEFAULT -1,
  body        TEXT         NOT NULL,
  created_at  INT UNSIGNED NOT NULL,
  KEY idx_room (room_id, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- rate limiting / exponential back-off counters (cleaned automatically)
CREATE TABLE IF NOT EXISTS rate_limits (
  k             VARCHAR(100)  NOT NULL PRIMARY KEY,
  hits          INT           NOT NULL DEFAULT 0,
  ws            INT UNSIGNED  NOT NULL DEFAULT 0,   -- window start
  fails         INT           NOT NULL DEFAULT 0,
  blocked_until INT UNSIGNED  NOT NULL DEFAULT 0,
  touched       INT UNSIGNED  NOT NULL DEFAULT 0,
  KEY idx_touched (touched)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- first admin (change the password later from the admin panel / by replacing this hash)
INSERT IGNORE INTO admins (email, pass_hash, created_at) VALUES ('imrancse16th@gmail.com', '$2y$10$rJUWoVks/Q9HV/D8Zi3HNO2cwNrTCFQRtJS57As4eIUsPzADCXp9q', UNIX_TIMESTAMP());