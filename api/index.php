<?php
require __DIR__ . '/db.php';
require __DIR__ . '/rooms.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') out(['ok' => true]);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST' && $method !== 'GET') out(['error' => 'method'], 405);

$q = input();
$a = need($q, 'a', 'key');
if ($method === 'GET' && $a !== 'ping') out(['error' => 'method'], 405);   // everything except ping must be POST (keeps secrets out of URLs/logs)

/** The player sends his id + secret token. Rate limited per player. */
function auth_player($q) {
    global $CFG;
    $id = need($q, 'id', 'pid'); $tok = need($q, 'token', 'tok');
    $p = q('SELECT p.*, (SELECT username FROM users WHERE player_id=p.id) AS username FROM players p WHERE p.id=?', [$id])->fetch();
    if (!$p || !hash_equals($p['token'], $tok)) { rl_hit('badtok', client_ip(), $CFG['limits']['login_ip']); out(['error' => 'bad_token'], 403); }
    if (!empty($p['banned'])) out(['error' => 'banned'], 403);
    rl_hit('user', $id, $CFG['limits']['user']);
    q('UPDATE players SET last_seen=? WHERE id=?', [time(), $id]);
    return $p;
}
function fresh($id) { return q('SELECT p.*, (SELECT username FROM users WHERE player_id=p.id) AS username FROM players p WHERE p.id=?', [$id])->fetch(); }

try {
    $L = $CFG['limits']; $ip = client_ip();
    switch ($a) {
    case 'ping':
        rl_hit('public', $ip, $L['public']);
        out(['ok' => true, 'time' => time(), 'db' => (bool)db()->query('SELECT 1')->fetchColumn()]);

    case 'register': {
        rl_hit('register', $ip, $L['register']);
        $name = need($q, 'name', 'name'); $pw = need($q, 'password', 'pw', false, '');
        $user = $pw !== '' ? need($q, 'username', 'name', false, $name) : '';
        $email = '';
        if ($pw !== '') {                                   // a real account needs name + email + password
            ensure_email_col();
            $email = strtolower(need($q, 'email', 'email'));
            if (strlen($email) > 120) out(['error' => 'invalid', 'field' => 'email'], 422);
            if (q('SELECT 1 FROM users WHERE email=?', [$email])->fetch()) out(['error' => 'email_taken'], 409);
        }
        if ($user !== '' && q('SELECT 1 FROM users WHERE username=?', [$user])->fetch()) out(['error' => 'name_taken'], 409);
        for ($t = 0; $t < 20; $t++) {
            $id = (string)random_int(100000, 999999);
            if (!q('SELECT 1 FROM players WHERE id=?', [$id])->fetch()) break;
        }
        $token = rnd(32); $now = time();
        $pdo = db(); $pdo->beginTransaction();
        try {
            q('INSERT INTO players (id,name,token,gems,coins,created_at,last_seen) VALUES (?,?,?,?,?,?,?)', [$id, $name, $token, 0, 500, $now, $now]);
            if ($user !== '') q('INSERT INTO users (username,email,pass_hash,player_id,created_at) VALUES (?,?,?,?,?)', [$user, $email, password_hash($pw, PASSWORD_DEFAULT), $id, $now]);
            $pdo->commit();
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($e->getCode() === '23000') out(['error' => (strpos($e->getMessage(), 'email') !== false ? 'email_taken' : 'name_taken')], 409);   // taken at the same moment
            throw $e;
        }
        out(['id' => $id, 'name' => $name, 'username' => $user, 'email' => $email, 'gems' => 0, 'coins' => 500, 'token' => $token, 'has_pass' => $user !== '']);
    }

    // log in on any device with username (or 6-digit player ID) + password.
    // Per-IP and per-account limits with exponential back-off (no hard lockout).
    case 'login': {
        $who = need($q, 'user', 'text'); $pw = need($q, 'password', 'pw');
        $acc = strtolower($who);
        rl_hit('login_ip', $ip, $L['login_ip']);
        rl_blocked('login_ip_fail', $ip); rl_blocked('login_acc_fail', $acc);
        $u = null; ensure_email_col();
        if (strpos($who, '@') !== false) $u = q('SELECT * FROM users WHERE email=?', [strtolower($who)])->fetch();
        if (!$u && preg_match('/^[0-9]{6}$/', $who)) $u = q('SELECT * FROM users WHERE player_id=?', [$who])->fetch();
        if (!$u) $u = q('SELECT * FROM users WHERE username=?', [$who])->fetch();
        // a 6-digit ID that exists but never got a password (guest): nobody can take it over from another phone; tell the owner how to fix it
        if (!$u && preg_match('/^[0-9]{6}$/', $who) && q('SELECT 1 FROM players WHERE id=?', [$who])->fetch()) { rl_fail('login_ip_fail', $ip); out(['error' => 'no_password'], 403); }
        $ok = $u && password_verify($pw, $u['pass_hash']);
        if (!$u) password_verify($pw, '$2y$10$uvzUkM/IUkHOs1jZumeGMuMzV6aGk.mL54QoUfV/kW6RUMhO5doau');   // same timing for unknown names
        if (!$ok) { rl_fail('login_ip_fail', $ip); rl_fail('login_acc_fail', $acc); out(['error' => 'bad_login'], 403); }
        $p = fresh($u['player_id']);
        if (!$p) out(['error' => 'bad_login'], 403);
        if (!empty($p['banned'])) out(['error' => 'banned'], 403);
        rl_ok('login_acc_fail', $acc); rl_ok('login_ip_fail', $ip);
        q('UPDATE users SET last_login=? WHERE id=?', [time(), $u['id']]);
        q('UPDATE players SET last_seen=? WHERE id=?', [time(), $p['id']]);
        $grant = claim_grant($p['id']); $p = fresh($p['id']);
        out(array_merge(player_view($p, true), ['token' => $p['token'], 'grant' => $grant]));
    }

    // give a guest account a username + password (so it can be opened on another phone); or change the password
    case 'set_password': {
        $p = auth_player($q); $pw = need($q, 'password', 'pw');
        $row = q('SELECT id FROM users WHERE player_id=?', [$p['id']])->fetch();
        if ($row) { q('UPDATE users SET pass_hash=? WHERE id=?', [password_hash($pw, PASSWORD_DEFAULT), $row['id']]); out(['ok' => true]); }
        $user = need($q, 'username', 'name'); ensure_email_col();
        $email = strtolower(need($q, 'email', 'email')); if (strlen($email) > 120) out(['error' => 'invalid', 'field' => 'email'], 422);
        if (q('SELECT 1 FROM users WHERE username=?', [$user])->fetch()) out(['error' => 'name_taken'], 409);
        if (q('SELECT 1 FROM users WHERE email=?', [$email])->fetch()) out(['error' => 'email_taken'], 409);
        try { q('INSERT INTO users (username,email,pass_hash,player_id,created_at) VALUES (?,?,?,?,?)', [$user, $email, password_hash($pw, PASSWORD_DEFAULT), $p['id'], time()]); }
        catch (PDOException $e) { if ($e->getCode() === '23000') out(['error' => (strpos($e->getMessage(), 'email') !== false ? 'email_taken' : 'name_taken')], 409); throw $e; }
        out(['ok' => true, 'username' => $user]);
    }

    // store the player's progress (coins, owned pens, stats) so it follows the account
    case 'save': {
        $p = auth_player($q); $d = need($q, 'data', 'arr');
        $keep = [];
        if (isset($d['coins'])) { $keep['coins'] = need($d, 'coins', 'int:0:100000000'); }
        if (isset($d['owned'])) {
            $o = need($d, 'owned', 'arr'); if (count($o) > 40) out(['error' => 'invalid', 'field' => 'owned'], 422);
            foreach ($o as $i => $pen) $o[$i] = need($o, $i, 'penid');
            $keep['owned'] = array_values($o);
        }
        if (isset($d['pen']))   $keep['pen'] = need($d, 'pen', 'penid');
        if (isset($d['arena'])) $keep['arena'] = need($d, 'arena', 'penid');
        foreach (['xp', 'trophies', 'wins', 'losses'] as $f) if (isset($d[$f])) $keep[$f] = need($d, $f, 'int:0:100000000');
        q('UPDATE players SET data=?, coins=? WHERE id=?', [json_encode($keep), (int)($keep['coins'] ?? $p['coins']), $p['id']]);
        out(['ok' => true]);
    }
    case 'get': {
        $p = auth_player($q);
        $n = need($q, 'name', 'name', false);
        if ($n !== null) { q('UPDATE players SET name=? WHERE id=?', [$n, $p['id']]); $p['name'] = $n; }
        $grant = claim_grant($p['id']); $p = fresh($p['id']);
        out(array_merge(player_view($p, true), ['grant' => $grant]));
    }

    // spend diamonds (buying a pen) — the server checks the balance
    case 'spend': {
        $p = auth_player($q); $gems = need($q, 'gems', 'int:0:1000000'); $item = need($q, 'item', 'text', false, '');
        $st = q('UPDATE players SET gems=gems-? WHERE id=? AND gems>=?', [$gems, $p['id'], $gems]);
        if ($st->rowCount() < 1 && $gems > 0) out(['error' => 'not_enough', 'gems' => (int)$p['gems']], 400);
        q('INSERT INTO wallet_log (player_id,kind,item,gems,created_at) VALUES (?,?,?,?,?)', [$p['id'], 'buy', $item, -$gems, time()]);
        out(player_view(fresh($p['id'])));
    }

    // DEMO store: only when config 'dummy_store' is true (off in production)
    case 'dummy_buy': {
        if (empty($CFG['dummy_store'])) out(['error' => 'disabled'], 403);
        $p = auth_player($q);
        $packs = ['100' => 100, '500' => 550, '1200' => 1440, '3000' => 3750, '6500' => 8450];
        $key = need($q, 'pack', 'enum:' . implode(',', array_keys($packs)));
        q('UPDATE players SET gems=gems+? WHERE id=?', [$packs[$key], $p['id']]);
        q('INSERT INTO wallet_log (player_id,kind,item,gems,created_at) VALUES (?,?,?,?,?)', [$p['id'], 'dummy_pack', $key, $packs[$key], time()]);
        out(player_view(fresh($p['id'])));
    }

    default:
        if (strpos($a, 'room_') === 0) handle_room($a, $q);
        out(['error' => 'unknown_action'], 400);
    }
} catch (PDOException $e) {
    plog($e);
    out(['error' => 'server_error'], 500);
} catch (Throwable $e) {
    plog($e);
    out(['error' => 'server_error'], 500);
}
