<?php
// Shared helpers: config, safe error handling, PDO (MySQL), JSON output, strict validation, rate limiting.
// Never printed to users: stack traces, file paths, SQL errors. Everything is logged server-side (PHP error_log).

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('html_errors', '0');

function plog($what) {
    $m = $what instanceof Throwable ? get_class($what) . ': ' . $what->getMessage() . ' @ ' . $what->getFile() . ':' . $what->getLine() : (string)$what;
    @error_log('[PENFIGHT] ' . $m);
}
function fail_generic($code = 500) {
    if (!headers_sent()) {
        http_response_code($code);
        if (defined('PF_HTML')) { header('Content-Type: text/html; charset=utf-8'); echo '<!doctype html><meta charset="utf-8"><title>Error</title><p>Something went wrong. Please try again later.</p>'; }
        else { header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); echo '{"error":"server_error"}'; }
    }
    exit;
}
set_error_handler(function ($no, $str, $file, $line) { plog("PHP[$no] $str @ $file:$line"); return true; });
set_exception_handler(function ($e) { plog($e); fail_generic(500); });
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) { plog("FATAL {$e['message']} @ {$e['file']}:{$e['line']}"); fail_generic(500); }
});

foreach (['pdo_mysql', 'mbstring', 'json'] as $ext) if (!extension_loaded($ext)) { plog("missing PHP extension: $ext"); fail_generic(500); }

// ---- config: defaults < config.php < config.local.php (XAMPP only) < environment variables ----
$CFG_DEFAULTS = [
    'db_host' => 'localhost', 'db_name' => '', 'db_user' => '', 'db_pass' => '',
    'admin_hash' => '', 'dummy_store' => false,
    'cors_origin' => '*',               // the app sends no cookies; tokens are in the body
    'trust_proxy_header' => '',         // e.g. 'HTTP_X_FORWARDED_FOR' only if the host really sits behind a trusted proxy
    // rate limits: [max requests, window seconds]
    'limits' => [
        'register'    => [30, 3600],    // new accounts per IP (many players can share one school/mobile IP)
        'login_ip'    => [30, 600],     // login attempts per IP
        'login_free'  => 3,             // wrong passwords allowed before the delay starts (per IP and per account)
        'login_base'  => 2,             // first delay in seconds; doubles with every further failure
        'login_cap'   => 900,           // maximum delay in seconds
        'admin_ip'    => [10, 600],
        'public'      => [240, 60],     // ping etc. per IP
        'room_create' => [20, 600],     // per IP
        'room_join'   => [60, 60],      // per IP
        'user'        => [300, 60],     // authenticated account actions per player
        'room_io'     => [3000, 60],    // poll / send per room member (a game sends several per second)
    ],
];
$CFG = $CFG_DEFAULTS;
$merge = function ($over) use (&$CFG) { foreach ($over as $k => $v) { $CFG[$k] = ($k === 'limits' && is_array($v)) ? array_merge($CFG['limits'], $v) : $v; } };
if (is_file(__DIR__ . '/config.php')) $merge(require __DIR__ . '/config.php');
// config.local.php is honoured ONLY on a local machine, so uploading it by mistake can never break the live site
$host = strtolower(preg_replace('/:[0-9]+$/', '',$_SERVER['HTTP_HOST'] ?? ''));
if ((PHP_SAPI === 'cli' || in_array($host, ['localhost', '127.0.0.1', '[::1]'], true)) && is_file(__DIR__ . '/config.local.php')) $merge(require __DIR__ . '/config.local.php');
foreach (['db_host', 'db_name', 'db_user', 'db_pass', 'admin_hash'] as $k) { $e = getenv('PF_' . strtoupper($k)); if ($e !== false && $e !== '') $CFG[$k] = $e; }
if (($e = getenv('PF_DUMMY_STORE')) !== false) $CFG['dummy_store'] = $e === '1';
if (($e = getenv('PF_LIMITS')) !== false && ($j = json_decode($e, true)) && is_array($j)) $CFG['limits'] = array_merge($CFG['limits'], $j);

function db() {
    global $CFG;
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        "mysql:host={$CFG['db_host']};dbname={$CFG['db_name']};charset=utf8mb4",
        $CFG['db_user'], $CFG['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_TIMEOUT => 5]
    );
    return $pdo;
}
function q($sql, $args = []) { $st = db()->prepare($sql); $st->execute($args); return $st; }

function out($data, $code = 200) {
    global $CFG;
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . $CFG['cors_origin']);
    header('Access-Control-Allow-Headers: Content-Type');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function input() {
    static $q = null;
    if ($q !== null) return $q;
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 60000) out(['error' => 'too_big'], 413);
    $j = $raw === '' ? [] : json_decode($raw, true);
    if ($raw !== '' && !is_array($j)) out(['error' => 'invalid', 'field' => 'body'], 422);
    return $q = array_merge($_GET, $j);
}

// ---- strict validation: reject, never "clean up" ----
function need($q, $key, $rule, $required = true, $default = null) {
    if (!array_key_exists($key, $q) || $q[$key] === null || $q[$key] === '') {
        if ($required) out(['error' => 'invalid', 'field' => $key], 422);
        return $default;
    }
    $v = $q[$key];
    $bad = function () use ($key) { out(['error' => 'invalid', 'field' => $key], 422); };
    if ($rule === 'arr') { if (!is_array($v)) $bad(); return $v; }
    if (!is_scalar($v) || is_bool($v)) $bad();
    $s = (string)$v;
    if ($rule === 'int' || strncmp($rule, 'int:', 4) === 0) {
        if (!preg_match('/^-?\d{1,9}$/', $s)) $bad();
        $n = (int)$s;
        if ($rule !== 'int') { [, $lo, $hi] = explode(':', $rule); if ($n < (int)$lo || $n > (int)$hi) $bad(); }
        return $n;
    }
    if (strncmp($rule, 'enum:', 5) === 0) { if (!in_array($s, explode(',', substr($rule, 5)), true)) $bad(); return $s; }
    static $re = [
        'pid'   => '/^\d{6}$/',                              // player id
        'tok'   => '/^[a-f0-9]{32}$/',                       // player token
        'rt'    => '/^[a-f0-9]{16}$/',                       // room member secret
        'rid'   => '/^[A-HJ-NP-Z2-9]{5}$/',                  // room id
        'penid' => '/^[a-z][a-z0-9_]{0,19}$/',
        'name'  => '/^[\p{L}\p{M}\p{N} ._\-]{1,14}$/u',
        'rpass' => '/^[\x20-\x7E]{0,12}$/',                  // room password (printable ASCII)
        'pw'    => '/^[\x20-\x7E\p{L}\p{N}\p{P}\p{S}]{4,72}$/u',
        'key'   => '/^[A-Za-z0-9_\-]{1,20}$/',
        'email' => '/^[^\s@<>"\']{1,64}@[^\s@<>"\']{1,100}\.[A-Za-z]{2,20}$/',
        'text'  => '/^[^\x00-\x08\x0B\x0C\x0E-\x1F]{0,60}$/u',
    ];
    if (!isset($re[$rule]) || !preg_match($re[$rule], $s)) $bad();
    return $s;
}

// ---- rate limiting (MySQL-backed, works on shared hosting) ----
function client_ip() {
    global $CFG;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if ($CFG['trust_proxy_header'] && !empty($_SERVER[$CFG['trust_proxy_header']])) {
        $first = trim(explode(',', $_SERVER[$CFG['trust_proxy_header']])[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) $ip = $first;
    }
    return substr($ip, 0, 45);
}
function too_many($retry) { header('Retry-After: ' . max(1, (int)$retry)); out(['error' => 'rate_limited', 'retry_after' => max(1, (int)$retry)], 429); }
/** Counts one request in a fixed window; blocks when over the limit. $lim = [max, windowSeconds] (see $CFG['limits']). */
function rl_hit($bucket, $id, $lim) {
    [$max, $win] = $lim; $now = time(); $k = substr($bucket . ':' . $id, 0, 100);
    q('INSERT INTO rate_limits (k,hits,ws,touched) VALUES (?,1,?,?) ON DUPLICATE KEY UPDATE hits=IF(ws<=?,1,hits+1), ws=IF(ws<=?,?,ws), touched=?', [$k, $now, $now, $now - $win, $now - $win, $now, $now]);
    $r = q('SELECT hits,ws FROM rate_limits WHERE k=?', [$k])->fetch();
    if ($r && (int)$r['hits'] > $max) too_many($r['ws'] + $win - $now);
    if (mt_rand(1, 200) === 1) q('DELETE FROM rate_limits WHERE touched<? AND blocked_until<?', [$now - 86400, $now]);
}
/** Exponential back-off (no hard lockout): refuses while a delay from earlier failures is still running. */
function rl_blocked($bucket, $id) {
    $r = q('SELECT blocked_until FROM rate_limits WHERE k=?', [substr($bucket . ':' . $id, 0, 100)])->fetch();
    if ($r && (int)$r['blocked_until'] > time()) too_many((int)$r['blocked_until'] - time());
}
function rl_fail($bucket, $id) {
    global $CFG; $L = $CFG['limits']; $now = time(); $k = substr($bucket . ':' . $id, 0, 100);
    q('INSERT INTO rate_limits (k,hits,ws,fails,touched) VALUES (?,0,?,1,?) ON DUPLICATE KEY UPDATE fails=fails+1, touched=?', [$k, $now, $now, $now]);
    $f = (int)q('SELECT fails FROM rate_limits WHERE k=?', [$k])->fetchColumn();
    if ($f > $L['login_free']) {
        $delay = min($L['login_cap'], $L['login_base'] * (2 ** min(20, $f - $L['login_free'] - 1)));
        q('UPDATE rate_limits SET blocked_until=? WHERE k=?', [$now + $delay, $k]);
    }
}
function rl_ok($bucket, $id) { q('UPDATE rate_limits SET fails=0, blocked_until=0 WHERE k=?', [substr($bucket . ':' . $id, 0, 100)]); }

/** Adds the column that holds coins gifted by an admin but not yet delivered to the player's phone (auto-migrates old databases). */
function ensure_grant_col() {
    static $done = false; if ($done) return; $done = true;
    if (!q("SHOW COLUMNS FROM players LIKE 'grant_coins'")->fetch()) q('ALTER TABLE players ADD COLUMN grant_coins INT NOT NULL DEFAULT 0');
}
/** Hands the pending admin coins to the player (once). Returns the amount (can be negative). The phone adds it to its own coin count. */
function claim_grant($id) {
    $run = function () use ($id) {
        $pdo = db(); $pdo->beginTransaction();
        try {
            $g = (int)q('SELECT grant_coins FROM players WHERE id=? FOR UPDATE', [$id])->fetchColumn();
            if ($g !== 0) q('UPDATE players SET coins=GREATEST(0,coins+?), grant_coins=0 WHERE id=?', [$g, $id]);
            $pdo->commit(); return $g;
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    };
    try { return $run(); }
    catch (PDOException $e) { if (($e->errorInfo[1] ?? 0) == 1054) { ensure_grant_col(); return $run(); } throw $e; }
}
/** Adds the email column to login accounts (auto-migrates old databases). */
function ensure_email_col() {
    static $done = false; if ($done) return; $done = true;
    if (!q("SHOW COLUMNS FROM users LIKE 'email'")->fetch()) { q('ALTER TABLE users ADD COLUMN email VARCHAR(120) NULL'); try { q('ALTER TABLE users ADD UNIQUE KEY uq_email (email)'); } catch (Throwable $e) {} }
}
function rnd($n) { return substr(bin2hex(random_bytes((int)ceil($n / 2))), 0, $n); }
function player_view($p, $full = false) {
    $v = ['id' => $p['id'], 'name' => $p['name'], 'gems' => (int)$p['gems'], 'coins' => (int)$p['coins'], 'username' => $p['username'] ?? '', 'has_pass' => !empty($p['username'])];
    if ($full) $v['data'] = !empty($p['data']) ? json_decode($p['data'], true) : null;
    return $v;
}
