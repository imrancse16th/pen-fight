<?php
// PEN FIGHT admin dashboard. Admin accounts live in the `admins` table (email + password).
define('PF_HTML', true);
require __DIR__ . '/../api/db.php';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
header('Cache-Control: no-store');

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'secure' => $https]);
session_name('pf_admin');
session_start();

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function ago($t) { $d = time() - (int)$t; if ($t == 0) return '—'; if ($d < 90) return 'এইমাত্র'; if ($d < 3600) return floor($d / 60) . ' মিনিট আগে'; if ($d < 86400) return floor($d / 3600) . ' ঘণ্টা আগে'; return date('d M Y', (int)$t); }
function is_int_str($v, $max = 7) { return is_string($v) && preg_match('/^-?[0-9]{1,' . $max . '}$/', $v); }
function is_pid($v) { return is_string($v) && preg_match('/^[0-9]{6}$/', $v); }
function num($n) { return number_format((int)$n); }
/** a row of one-click gift buttons for a player */
function chips($pid, $csrf) {
    $b = ['g100' => '+100 💎', 'g500' => '+500 💎', 'c1000' => '+1,000 🪙', 'c5000' => '+5,000 🪙'];
    $o = '<form method="post" class="chips"><input type="hidden" name="csrf" value="' . $csrf . '"><input type="hidden" name="pid" value="' . h($pid) . '"><input type="hidden" name="add" value="1">';
    foreach ($b as $k => $n) $o .= '<button name="preset" value="' . $k . '" class="chip">' . $n . '</button>';
    return $o . '</form>';
}

$msg = ''; $good = false; $L = $CFG['limits']; $ip = client_ip();
$tab = in_array($_GET['t'] ?? '', ['dash', 'give', 'users', 'log', 'admins'], true) ? $_GET['t'] : 'dash';

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        if (isset($_POST['login'])) {
            rl_hit('admin_ip', $ip, $L['admin_ip']); rl_blocked('admin_fail', $ip);
            $pw = $_POST['pw'] ?? ''; $em = $_POST['email'] ?? '';
            $adm = (is_string($em) && is_string($pw) && strlen($em) <= 120 && strlen($pw) <= 200) ? q('SELECT * FROM admins WHERE email=?', [strtolower(trim($em))])->fetch() : false;
            $okAdm = $adm && password_verify($pw, $adm['pass_hash']);
            if (!$adm) password_verify((string)$pw, '$2y$10$uvzUkM/IUkHOs1jZumeGMuMzV6aGk.mL54QoUfV/kW6RUMhO5doau');
            if ($okAdm) {
                q('UPDATE admins SET last_login=? WHERE id=?', [time(), $adm['id']]);
                rl_ok('admin_fail', $ip); session_regenerate_id(true);
                $_SESSION['ok'] = 1; $_SESSION['aid'] = (int)$adm['id']; $_SESSION['aem'] = $adm['email']; $_SESSION['csrf'] = bin2hex(random_bytes(16));
                header('Location: ./'); exit;
            }
            rl_fail('admin_fail', $ip); $msg = 'ইমেইল বা পাসওয়ার্ড ভুল';
        } elseif (!empty($_SESSION['ok'])) {
            $act = array_keys(array_intersect_key($_POST, array_flip(['logout', 'add', 'ban', 'resetpw', 'addadmin', 'deladmin', 'chpw'])))[0] ?? '';
            if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? ''))) { $msg = 'সেশন শেষ — পেজ রিলোড করুন'; }
            elseif ($act === 'logout') { session_destroy(); header('Location: ./'); exit; }
            elseif ($act === 'add') {                      // give / take diamonds and coins
                ensure_grant_col();
                $pid = trim((string)($_POST['pid'] ?? '')); $g = $_POST['gems'] ?? '0'; $c = $_POST['coins'] ?? '0';
                $presets = ['g50' => [50, 0], 'g100' => [100, 0], 'g500' => [500, 0], 'g1000' => [1000, 0], 'c500' => [0, 500], 'c1000' => [0, 1000], 'c5000' => [0, 5000], 'c10000' => [0, 10000]];
                if (isset($_POST['preset']) && is_string($_POST['preset']) && isset($presets[$_POST['preset']])) { [$g, $c] = array_map('strval', $presets[$_POST['preset']]); }
                $g = trim((string)$g) === '' ? '0' : trim((string)$g); $c = trim((string)$c) === '' ? '0' : trim((string)$c);
                if (strtoupper($pid) === 'ALL') {
                    if (!is_int_str($g) || !is_int_str($c)) $msg = 'সংখ্যা ঠিক নেই';
                    elseif ((int)$g === 0 && (int)$c === 0) $msg = 'কত ডায়মন্ড/কয়েন দেবেন লিখুন';
                    elseif (($_POST['sure'] ?? '') !== '1') $msg = 'সবাইকে দিতে "আমি নিশ্চিত" টিক দিন';
                    else {
                        $n = q('UPDATE players SET gems=GREATEST(0,gems+?), grant_coins=grant_coins+? WHERE banned=0', [(int)$g, (int)$c])->rowCount();
                        q("INSERT INTO wallet_log (player_id,kind,item,gems,coins,created_at) SELECT id,'admin',?,?,?,? FROM players WHERE banned=0", ['admin:ALL', (int)$g, (int)$c, time()]);
                        $msg = 'সব ' . $n . ' জন প্লেয়ারকে ' . (int)$g . ' ডায়মন্ড ও ' . (int)$c . ' কয়েন দেওয়া হয়েছে'; $good = true;
                    }
                }
                elseif (!is_pid($pid) || !is_int_str($g) || !is_int_str($c)) $msg = 'ইনপুট ঠিক নেই (আইডি ৬ সংখ্যা, সংখ্যা ঠিক রাখুন)';
                else {
                    $p = q('SELECT id,name FROM players WHERE id=?', [$pid])->fetch();
                    if (!$p) $msg = 'এই আইডির প্লেয়ার পাওয়া যায়নি';
                    elseif ((int)$g === 0 && (int)$c === 0) $msg = 'কত ডায়মন্ড/কয়েন দেবেন লিখুন';
                    else {
                        // diamonds change on the server at once; coins wait in grant_coins until the player's phone picks them up (the phone owns the coin count)
                        q('UPDATE players SET gems=GREATEST(0,gems+?), grant_coins=grant_coins+? WHERE id=?', [(int)$g, (int)$c, $pid]);
                        q('INSERT INTO wallet_log (player_id,kind,item,gems,coins,created_at) VALUES (?,?,?,?,?,?)', [$pid, 'admin', mb_substr('admin:' . ($_SESSION['aem'] ?? ''), 0, 60), (int)$g, (int)$c, time()]);
                        $msg = $p['name'] . ' (#' . $pid . '): ' . ((int)$g ? ((int)$g > 0 ? '+' : '') . (int)$g . ' ডায়মন্ড ' : '') . ((int)$c ? ((int)$c > 0 ? '+' : '') . (int)$c . ' কয়েন ' : '') . '— সফল! অ্যাপ চালু থাকলে ২০ সেকেন্ডের মধ্যে, না হলে খোলার সাথে সাথে পাবে'; $good = true;
                    }
                }
            }
            elseif ($act === 'ban' || $act === 'resetpw') {
                $pid = $_POST['pid'] ?? '';
                $p = is_pid($pid) ? q('SELECT id,name FROM players WHERE id=?', [$pid])->fetch() : false;
                if (!$p) $msg = 'প্লেয়ার পাওয়া যায়নি';
                elseif ($act === 'ban') {
                    $v = (($_POST['ban'] ?? '') === '1') ? 1 : 0;
                    q('UPDATE players SET banned=? WHERE id=?', [$v, $pid]);
                    $msg = $p['name'] . ($v ? ' — ব্যান করা হয়েছে' : ' — আনব্যান করা হয়েছে'); $good = true;
                } else {
                    $np = (string)($_POST['newpw'] ?? '');
                    if (strlen($np) < 4 || strlen($np) > 72) $msg = 'নতুন পাসওয়ার্ড ৪–৭২ অক্ষর';
                    else {
                        $hh = password_hash($np, PASSWORD_DEFAULT);
                        if (q('SELECT 1 FROM users WHERE player_id=?', [$pid])->fetch()) q('UPDATE users SET pass_hash=? WHERE player_id=?', [$hh, $pid]);
                        else q('INSERT INTO users (username,pass_hash,player_id,created_at) VALUES (?,?,?,?)', ['p' . $pid, $hh, $pid, time()]);
                        rl_ok('login_acc_fail', 'p' . $pid);
                        $msg = $p['name'] . ' — নতুন পাসওয়ার্ড সেট হয়েছে'; $good = true;
                    }
                }
            }
            elseif ($act === 'addadmin') {
                $em = strtolower(trim((string)($_POST['email'] ?? ''))); $pw = (string)($_POST['pw'] ?? '');
                if (!filter_var($em, FILTER_VALIDATE_EMAIL) || strlen($em) > 120) $msg = 'ইমেইল ঠিক নেই';
                elseif (strlen($pw) < 8 || strlen($pw) > 72) $msg = 'পাসওয়ার্ড ৮–৭২ অক্ষর হতে হবে';
                elseif (q('SELECT 1 FROM admins WHERE email=?', [$em])->fetch()) $msg = 'এই ইমেইলের অ্যাডমিন আছে';
                else { q('INSERT INTO admins (email,pass_hash,created_at) VALUES (?,?,?)', [$em, password_hash($pw, PASSWORD_DEFAULT), time()]); $msg = 'নতুন অ্যাডমিন যোগ হয়েছে: ' . $em; $good = true; }
                $tab = 'admins';
            }
            elseif ($act === 'deladmin') {
                $aid = $_POST['aid'] ?? '';
                if (!is_int_str($aid, 9)) $msg = 'ভুল অনুরোধ';
                elseif ((int)$aid === (int)$_SESSION['aid']) $msg = 'নিজেকে মুছতে পারবেন না';
                elseif ((int)q('SELECT COUNT(*) FROM admins')->fetchColumn() < 2) $msg = 'শেষ অ্যাডমিন মোছা যাবে না';
                else { q('DELETE FROM admins WHERE id=?', [(int)$aid]); $msg = 'অ্যাডমিন মুছে ফেলা হয়েছে'; $good = true; }
                $tab = 'admins';
            }
            elseif ($act === 'chpw') {
                $cur = (string)($_POST['cur'] ?? ''); $np = (string)($_POST['pw'] ?? '');
                $me = q('SELECT * FROM admins WHERE id=?', [(int)$_SESSION['aid']])->fetch();
                if (!$me || !password_verify($cur, $me['pass_hash'])) $msg = 'বর্তমান পাসওয়ার্ড ভুল';
                elseif (strlen($np) < 8 || strlen($np) > 72) $msg = 'নতুন পাসওয়ার্ড ৮–৭২ অক্ষর';
                else { q('UPDATE admins SET pass_hash=? WHERE id=?', [password_hash($np, PASSWORD_DEFAULT), $me['id']]); $msg = 'আপনার পাসওয়ার্ড বদলানো হয়েছে'; $good = true; }
                $tab = 'admins';
            }
        }
    }
    $in = !empty($_SESSION['ok']);
    $D = [];
    if ($in) {
        $now = time(); ensure_grant_col(); ensure_email_col();
        if ($tab === 'dash') {
            $D['st'] = q('SELECT COUNT(*) total, COALESCE(SUM(gems),0) gems, COALESCE(SUM(coins),0) coins, COALESCE(SUM(banned),0) banned,
                          COALESCE(SUM(last_seen>?),0) online, COALESCE(SUM(created_at>?),0) today FROM players', [$now - 300, $now - 86400])->fetch();
            $D['reg'] = (int)q('SELECT COUNT(*) FROM users')->fetchColumn();
            $D['rooms'] = (int)q('SELECT COUNT(*) FROM rooms WHERE closed=0 AND last_seen>?', [$now - 120])->fetchColumn();
            $D['week'] = q('SELECT FLOOR(created_at/86400) d, COUNT(*) n FROM players WHERE created_at>? GROUP BY d', [$now - 7 * 86400])->fetchAll(PDO::FETCH_KEY_PAIR);
            $D['recent'] = q('SELECT p.id,p.name,p.last_seen,p.created_at,(SELECT username FROM users WHERE player_id=p.id) AS username FROM players p ORDER BY p.created_at DESC LIMIT 8')->fetchAll();
            $D['log'] = q('SELECT w.*, p.name FROM wallet_log w LEFT JOIN players p ON p.id=w.player_id ORDER BY w.id DESC LIMIT 8')->fetchAll();
        } elseif ($tab === 'give') {
            $s = isset($_GET['s']) && is_string($_GET['s']) ? mb_substr(trim($_GET['s']), 0, 30) : '';
            $D['s'] = $s; $a = []; $w = '';
            if ($s !== '') { $w = 'WHERE (p.id=? OR p.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'; $lk = '%' . addcslashes($s, '%_\\') . '%'; $a = [$s, $lk, $lk, $lk]; }
            $D['rows'] = q('SELECT p.id,p.name,p.gems,p.coins,p.grant_coins,p.banned,p.last_seen,u.username,u.email FROM players p LEFT JOIN users u ON u.player_id=p.id ' . $w . ' ORDER BY p.last_seen DESC LIMIT 15', $a)->fetchAll();
        } elseif ($tab === 'users') {
            $s = isset($_GET['s']) && is_string($_GET['s']) ? mb_substr(trim($_GET['s']), 0, 30) : '';
            $f = in_array($_GET['f'] ?? '', ['reg', 'guest', 'banned'], true) ? $_GET['f'] : '';
            $page = max(1, min(10000, (int)($_GET['pg'] ?? 1))); $per = 25;
            $w = []; $a = [];
            if ($s !== '') { $w[] = '(p.id=? OR p.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'; $lk = '%' . addcslashes($s, '%_\\') . '%'; array_push($a, $s, $lk, $lk, $lk); }
            if ($f === 'reg') $w[] = 'u.id IS NOT NULL'; elseif ($f === 'guest') $w[] = 'u.id IS NULL'; elseif ($f === 'banned') $w[] = 'p.banned=1';
            $where = $w ? 'WHERE ' . implode(' AND ', $w) : '';
            $from = 'FROM players p LEFT JOIN users u ON u.player_id=p.id ' . $where;
            $D['count'] = (int)q('SELECT COUNT(*) ' . $from, $a)->fetchColumn();
            $D['rows'] = q('SELECT p.id,p.name,p.gems,p.coins,p.grant_coins,p.banned,p.last_seen,p.created_at,u.username,u.email ' . $from . ' ORDER BY p.last_seen DESC LIMIT ' . $per . ' OFFSET ' . (($page - 1) * $per), $a)->fetchAll();
            $D['s'] = $s; $D['f'] = $f; $D['page'] = $page; $D['per'] = $per;
            $D['det'] = null; $D['plog'] = [];
            if (isset($_GET['p']) && is_pid($_GET['p'])) {
                $D['det'] = q('SELECT p.*, (SELECT username FROM users WHERE player_id=p.id) AS username, (SELECT email FROM users WHERE player_id=p.id) AS email FROM players p WHERE p.id=?', [$_GET['p']])->fetch();
                if ($D['det']) $D['plog'] = q('SELECT kind,item,gems,coins,created_at FROM wallet_log WHERE player_id=? ORDER BY id DESC LIMIT 30', [$D['det']['id']])->fetchAll();
            }
        } elseif ($tab === 'log') {
            $D['log'] = q('SELECT w.*, p.name FROM wallet_log w LEFT JOIN players p ON p.id=w.player_id ORDER BY w.id DESC LIMIT 100')->fetchAll();
        } elseif ($tab === 'admins') {
            $D['admins'] = q('SELECT id,email,created_at,last_login FROM admins ORDER BY id')->fetchAll();
        }
    }
} catch (Throwable $e) {
    plog($e); fail_generic(500);
}
$csrf = !empty($_SESSION['csrf']) ? h($_SESSION['csrf']) : '';
$kindName = ['buy' => 'পেন কেনা', 'dummy_pack' => 'ডেমো প্যাক', 'admin' => 'অ্যাডমিন'];
$pend = function ($r) { $g = (int)($r['grant_coins'] ?? 0); return $g ? ' <span class="pill w" title="প্লেয়ারের ফোনে এখনো পৌঁছায়নি">' . ($g > 0 ? '+' : '') . num($g) . ' অপেক্ষায়</span>' : ''; };
?><!doctype html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PEN FIGHT Admin</title>
<style>
:root{--bg:#0a1330;--card:#13265c;--line:#2a4486;--tx:#eaf0ff;--mut:#9db4ee;--gold:#ffc61a;--gold2:#ff9d00;--gem:#69dcff}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{font-family:"Noto Sans Bengali","Segoe UI",system-ui,Roboto,sans-serif;background:radial-gradient(1200px 600px at 80% -10%,#1b3a8f55,transparent),var(--bg);color:var(--tx);margin:0;min-height:100vh;line-height:1.45}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
.top{position:sticky;top:0;z-index:5;background:#0b1740ee;backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.brand{display:flex;align-items:center;gap:9px;margin-right:12px;font-weight:800;font-size:18px;letter-spacing:.3px}
.brand i{font-style:normal;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--gold),var(--gold2));box-shadow:0 4px 14px #ffb30055;font-size:18px}
.top a.tab{padding:8px 14px;border-radius:10px;color:#cfe0ff;font-weight:600;font-size:14px}
.top a.tab:hover{background:#ffffff14;text-decoration:none}
.top a.tab.on{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#2a1a00;box-shadow:0 4px 14px #ffb30044}
.top .sp{flex:1}.top small{color:var(--mut)}
.wrap{max-width:1150px;margin:18px auto 50px;padding:0 14px}
.card{background:linear-gradient(180deg,var(--card),#112456);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:16px;box-shadow:0 10px 30px #00000033}
.card h2{font-size:16px;margin:0 0 12px;display:flex;align-items:center;gap:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.g2{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
.stat{display:flex;gap:12px;align-items:center;background:linear-gradient(180deg,var(--card),#112456);border:1px solid var(--line);border-radius:16px;padding:14px}
.stat .ic{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-size:23px;background:#ffffff14;flex:none}
.stat b{display:block;font-size:24px;line-height:1.1;color:#fff}.stat span{font-size:12.5px;color:var(--mut)}
.stat.gold .ic{background:#ffc61a26}.stat.blue .ic{background:#4a7bff33}.stat.green .ic{background:#2fbf7133}.stat.red .ic{background:#e5483a33}.stat.cyan .ic{background:#69dcff26}
input,select,button{font:inherit;padding:10px 13px;border-radius:10px;border:1px solid transparent;margin:2px}
input,select{background:#0a1536;color:#fff;border-color:var(--line);outline:none}
input:focus,select:focus{border-color:var(--gold);box-shadow:0 0 0 3px #ffc61a33}
input::placeholder{color:#7d93cc}
input[type=checkbox]{width:18px;height:18px;padding:0;vertical-align:middle;accent-color:var(--gold)}
button{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#2a1a00;font-weight:800;cursor:pointer;transition:transform .08s,filter .15s}
button:hover{filter:brightness(1.08)}button:active{transform:scale(.97)}
button.d{background:linear-gradient(135deg,#f0624f,#c0392b);color:#fff}button.g{background:linear-gradient(135deg,#38d484,#1f9b58);color:#fff}button.s{background:#2c4690;color:#fff;border-color:var(--line)}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.chip{background:#ffffff12;color:#fff;border:1px solid var(--line);padding:6px 12px;font-size:13px;font-weight:700;border-radius:999px;margin:0}
.chip:hover{background:#ffc61a33;border-color:var(--gold)}
table{width:100%;border-collapse:collapse}th,td{padding:10px 8px;border-bottom:1px solid #ffffff12;text-align:left;font-size:14px;vertical-align:middle}
th{color:var(--mut);font-weight:700;font-size:12px;letter-spacing:.4px}tr:hover td{background:#ffffff08}
.scroll{overflow-x:auto}
.m{padding:12px 16px;border-radius:12px;margin-bottom:14px;background:#0f7a3f;border:1px solid #2fbf71;font-weight:600}.m.e{background:#8c2a1d;border-color:#e5483a}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;background:#2c4690;font-weight:600}.pill.r{background:#1f9b58}.pill.b{background:#c0392b}.pill.w{background:#b9770e;color:#fff}
.pg{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.pg a,.pg span{padding:7px 12px;background:#2c4690;border-radius:9px}.pg span{background:var(--gold);color:#2a1a00;font-weight:800}
.row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.gem{color:var(--gem);font-weight:800}.coin{color:var(--gold);font-weight:800}
.hint{color:var(--mut);font-size:13px;margin-top:8px}
.gift{background:linear-gradient(135deg,#1c3b8f,#142a6a);border-color:#3a5cc0}
.bars{display:flex;gap:8px;align-items:flex-end;height:120px;margin-top:6px}
.bars div{flex:1;text-align:center;font-size:11px;color:var(--mut);display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.bars i{display:block;border-radius:7px 7px 3px 3px;background:linear-gradient(180deg,var(--gold),var(--gold2));min-height:4px;margin-bottom:4px}
.bars b{font-size:12px;color:#fff}
.who{display:flex;align-items:center;gap:10px}.av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#4a7bff,#2b4ec0);font-weight:800;flex:none}
.login{max-width:400px;margin:12vh auto 0;text-align:center}.login .brand{justify-content:center;margin:0 0 6px;font-size:22px}.login input{width:100%;margin:5px 0}.login button{width:100%;margin-top:8px;padding:12px}
.login p{color:var(--mut);margin:0 0 14px;font-size:14px}
.big{font-size:15px}
@media(max-width:640px){.top a.tab{padding:7px 10px;font-size:13px}.stat b{font-size:20px}th,td{padding:8px 5px;font-size:13px}.wrap{margin-top:12px}}
</style></head><body>
<?php if (!$in): ?>
<div class="wrap"><div class="card login"><div class="brand"><i>✏️</i> PEN FIGHT</div><p>অ্যাডমিন প্যানেলে লগইন করুন</p>
<?php if ($msg) echo '<div class="m e">' . h($msg) . '</div>'; ?>
<form method="post"><input type="email" name="email" placeholder="ইমেইল" autocomplete="username" required maxlength="120"><br>
<input type="password" name="pw" placeholder="পাসওয়ার্ড" autocomplete="current-password" required><br>
<button name="login" value="1">লগইন</button></form></div></div>
<?php else: ?>
<div class="top"><div class="brand"><i>✏️</i> PEN FIGHT</div>
<?php foreach (['dash' => '📊 ড্যাশবোর্ড', 'give' => '🎁 গিফট', 'users' => '👥 ইউজার', 'log' => '🧾 লেনদেন', 'admins' => '🔐 অ্যাডমিন'] as $k => $n) echo '<a class="tab' . ($tab === $k ? ' on' : '') . '" href="?t=' . $k . '">' . $n . '</a>'; ?>
<span class="sp"></span><small><?= h($_SESSION['aem'] ?? '') ?></small>
<form method="post" style="margin:0"><input type="hidden" name="csrf" value="<?= $csrf ?>"><button name="logout" value="1" class="s">বের হন</button></form></div>
<div class="wrap">
<?php if ($msg) echo '<div class="m' . ($good ? '' : ' e') . '">' . ($good ? '✅ ' : '⚠️ ') . h($msg) . '</div>'; ?>

<?php if ($tab === 'dash'): $st = $D['st']; ?>
<div class="grid">
<div class="stat blue"><div class="ic">👥</div><div><b><?= num($st['total']) ?></b><span>মোট প্লেয়ার</span></div></div>
<div class="stat green"><div class="ic">🟢</div><div><b><?= num($st['online']) ?></b><span>এখন অনলাইন (৫ মিনিট)</span></div></div>
<div class="stat blue"><div class="ic">🆕</div><div><b><?= num($st['today']) ?></b><span>গত ২৪ ঘণ্টায় নতুন</span></div></div>
<div class="stat"><div class="ic">🔑</div><div><b><?= num($D['reg']) ?></b><span>রেজিস্টার্ড অ্যাকাউন্ট</span></div></div>
<div class="stat green"><div class="ic">🎮</div><div><b><?= num($D['rooms']) ?></b><span>চালু রুম</span></div></div>
<div class="stat cyan"><div class="ic">💎</div><div><b><?= num($st['gems']) ?></b><span>প্লেয়ারদের মোট ডায়মন্ড</span></div></div>
<div class="stat gold"><div class="ic">🪙</div><div><b><?= num($st['coins']) ?></b><span>প্লেয়ারদের মোট কয়েন</span></div></div>
<div class="stat red"><div class="ic">🚫</div><div><b><?= num($st['banned']) ?></b><span>ব্যানড</span></div></div>
</div>

<div class="card gift"><h2>🎁 দ্রুত ডায়মন্ড / কয়েন দিন</h2>
<form method="post" class="row"><input type="hidden" name="csrf" value="<?= $csrf ?>">
<input name="pid" placeholder="প্লেয়ার আইডি (৬ সংখ্যা)" required maxlength="6" inputmode="numeric" style="width:200px">
<span class="gem">💎</span><input name="gems" type="number" value="100" style="width:110px" aria-label="ডায়মন্ড">
<span class="coin">🪙</span><input name="coins" type="number" value="0" style="width:110px" aria-label="কয়েন">
<button name="add" value="1">যোগ করুন</button></form>
<div class="hint">কেটে নিতে ঋণাত্মক সংখ্যা দিন (যেমন -50)। আইডি না জানলে <a href="?t=give">গিফট ট্যাবে</a> নাম দিয়ে খুঁজুন। প্লেয়ার নিজের আইডি দেখে: সেটিংস বা শপ স্ক্রিনে।</div></div>

<div class="card"><h2>📈 গত ৭ দিনে নতুন প্লেয়ার</h2><div class="bars">
<?php $vals = array_map('intval', array_values($D['week'])); $mx = max(1, $vals ? max($vals) : 1); for ($i = 6; $i >= 0; $i--) { $day = (int)floor((time() - $i * 86400) / 86400); $n = (int)($D['week'][$day] ?? 0); echo '<div><b>' . $n . '</b><i style="height:' . max(4, round($n / $mx * 80)) . 'px"></i>' . date('d/m', $day * 86400 + 43200) . '</div>'; } ?>
</div></div>

<div class="grid g2">
<div class="card"><h2>🆕 নতুন প্লেয়ার</h2><div class="scroll"><table><tr><th>আইডি</th><th>নাম</th><th>অ্যাকাউন্ট</th><th>যোগ</th></tr>
<?php foreach ($D['recent'] as $r) echo '<tr><td><a href="?t=users&p=' . h($r['id']) . '">' . h($r['id']) . '</a></td><td>' . h($r['name']) . '</td><td>' . ($r['username'] ? h($r['username']) : '<span class="pill">গেস্ট</span>') . '</td><td>' . h(ago($r['created_at'])) . '</td></tr>'; ?></table></div></div>
<div class="card"><h2>🧾 সর্বশেষ লেনদেন</h2><div class="scroll"><table><tr><th>প্লেয়ার</th><th>ধরন</th><th>💎</th><th>🪙</th><th>সময়</th></tr>
<?php foreach ($D['log'] as $l) echo '<tr><td>' . h($l['name'] ?? $l['player_id']) . '</td><td>' . h($kindName[$l['kind']] ?? $l['kind']) . '</td><td class="gem">' . (int)$l['gems'] . '</td><td class="coin">' . (int)$l['coins'] . '</td><td>' . h(ago($l['created_at'])) . '</td></tr>'; ?></table></div></div>
</div>

<?php elseif ($tab === 'give'): ?>
<div class="card"><h2>🔎 প্লেয়ার খুঁজে ডায়মন্ড / কয়েন দিন</h2>
<form method="get" class="row"><input type="hidden" name="t" value="give"><input name="s" value="<?= h($D['s']) ?>" placeholder="নাম, ইমেইল বা আইডি" maxlength="30" style="flex:1;min-width:200px"><button>খুঁজুন</button></form>
<div class="hint">খালি রেখে খুঁজলে সম্প্রতি খেলেছে এমন ১৫ জন দেখাবে। 💎 ডায়মন্ড সাথে সাথে বদলায়। 🪙 কয়েন প্লেয়ারের অ্যাপে পৌঁছালে বদলায় (অ্যাপ খোলা থাকলে ≈২০ সেকেন্ড)।</div></div>
<?php foreach ($D['rows'] as $r): ?>
<div class="card"><div class="row" style="justify-content:space-between">
<div class="who"><div class="av"><?= h(mb_strtoupper(mb_substr($r['name'], 0, 1))) ?></div><div><b class="big"><?= h($r['name']) ?></b> <?= $r['banned'] ? '<span class="pill b">ব্যানড</span>' : '' ?><br><small style="color:var(--mut)">#<?= h($r['id']) ?> · <?= $r['username'] ? h($r['username']) . ($r['email'] ? ' · ' . h($r['email']) : '') : 'গেস্ট' ?> · শেষ দেখা <?= h(ago($r['last_seen'])) ?></small></div></div>
<div><span class="gem"><?= num($r['gems']) ?> 💎</span> &nbsp; <span class="coin"><?= num($r['coins']) ?> 🪙</span><?= $pend($r) ?></div></div>
<?= chips($r['id'], $csrf) ?>
<form method="post" class="row"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="pid" value="<?= h($r['id']) ?>">
<span class="gem">💎</span><input name="gems" type="number" value="0" style="width:110px"> <span class="coin">🪙</span><input name="coins" type="number" value="0" style="width:110px"> <button name="add" value="1" class="g">দিন / কাটুন</button></form></div>
<?php endforeach; if (!$D['rows']) echo '<div class="card">কোনো প্লেয়ার পাওয়া যায়নি</div>'; ?>
<div class="card"><h2>📣 সব প্লেয়ারকে দিন</h2>
<form method="post" class="row"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="pid" value="ALL">
<span class="gem">💎</span><input name="gems" type="number" value="0" style="width:110px"> <span class="coin">🪙</span><input name="coins" type="number" value="0" style="width:110px">
<label><input type="checkbox" name="sure" value="1"> আমি নিশ্চিত</label> <button name="add" value="1" class="d">সবাইকে দিন</button></form>
<div class="hint">ব্যানড নয় এমন সব প্লেয়ার পাবে। ইভেন্ট বা ক্ষতিপূরণের জন্য।</div></div>

<?php elseif ($tab === 'users'): $det = $D['det']; ?>
<?php if ($det): ?>
<div class="card"><h2>👤 <?= h($det['name']) ?> <small style="color:var(--mut)">#<?= h($det['id']) ?></small> <?= $det['banned'] ? '<span class="pill b">ব্যানড</span>' : '' ?></h2>
<div>অ্যাকাউন্ট: <?= $det['username'] ? '<b>' . h($det['username']) . '</b>' . ($det['email'] ? ' · ✉️ ' . h($det['email']) : '') : 'নেই (গেস্ট)' ?> · <span class="gem"><?= num($det['gems']) ?> 💎</span> · <span class="coin"><?= num($det['coins']) ?> 🪙</span><?= $pend($det) ?> · তৈরি: <?= h(date('d M Y', (int)$det['created_at'])) ?> · শেষ দেখা: <?= h(ago($det['last_seen'])) ?></div>
<?= chips($det['id'], $csrf) ?>
<div class="row" style="margin-top:8px">
<form method="post" class="row"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="pid" value="<?= h($det['id']) ?>">
<span class="gem">💎</span><input name="gems" type="number" value="0" style="width:100px"> <span class="coin">🪙</span><input name="coins" type="number" value="0" style="width:100px"> <button name="add" value="1" class="g">দিন / কাটুন</button></form>
<form method="post"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="pid" value="<?= h($det['id']) ?>"><button name="ban" value="<?= $det['banned'] ? 0 : 1 ?>" class="<?= $det['banned'] ? 'g' : 'd' ?>"><?= $det['banned'] ? 'আনব্যান' : 'ব্যান করুন' ?></button></form>
<form method="post" class="row"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="pid" value="<?= h($det['id']) ?>"><input name="newpw" placeholder="নতুন পাসওয়ার্ড" minlength="4" maxlength="72" autocomplete="off"><button name="resetpw" value="1" class="s">পাসওয়ার্ড রিসেট</button></form></div>
<div class="scroll"><table style="margin-top:10px"><tr><th>ধরন</th><th>বিবরণ</th><th>💎</th><th>🪙</th><th>সময়</th></tr>
<?php foreach ($D['plog'] as $l) echo '<tr><td>' . h($kindName[$l['kind']] ?? $l['kind']) . '</td><td>' . h($l['item']) . '</td><td class="gem">' . (int)$l['gems'] . '</td><td class="coin">' . (int)$l['coins'] . '</td><td>' . h(date('d M H:i', (int)$l['created_at'])) . '</td></tr>'; ?></table></div>
<p><a href="?t=users">← তালিকায় ফিরুন</a></p></div>
<?php endif; ?>
<div class="card"><h2>👥 ইউজার তালিকা (<?= num($D['count']) ?>)</h2>
<form method="get" class="row"><input type="hidden" name="t" value="users"><input name="s" value="<?= h($D['s']) ?>" placeholder="নাম / ইউজারনেম / আইডি" maxlength="30">
<select name="f"><?php foreach (['' => 'সবাই', 'reg' => 'রেজিস্টার্ড', 'guest' => 'গেস্ট', 'banned' => 'ব্যানড'] as $k => $n) echo '<option value="' . $k . '"' . ($D['f'] === $k ? ' selected' : '') . '>' . $n . '</option>'; ?></select><button>খুঁজুন</button></form>
<div class="scroll"><table><tr><th>আইডি</th><th>নাম</th><th>অ্যাকাউন্ট / ইমেইল</th><th>💎</th><th>🪙</th><th>অবস্থা</th><th>শেষ দেখা</th><th>দ্রুত 💎</th></tr>
<?php foreach ($D['rows'] as $r): ?>
<tr><td><a href="?t=users&p=<?= h($r['id']) ?>"><?= h($r['id']) ?></a></td><td><?= h($r['name']) ?></td><td><?= $r['username'] ? h($r['username']) . ($r['email'] ? '<br><small style="color:var(--mut)">' . h($r['email']) . '</small>' : '') : '<span class="pill">গেস্ট</span>' ?></td>
<td class="gem"><?= num($r['gems']) ?></td><td class="coin"><?= num($r['coins']) ?><?= $pend($r) ?></td><td><?= $r['banned'] ? '<span class="pill b">ব্যানড</span>' : '<span class="pill r">সক্রিয়</span>' ?></td><td><?= h(ago($r['last_seen'])) ?></td>
<td><form method="post" class="row" style="flex-wrap:nowrap"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="pid" value="<?= h($r['id']) ?>"><input type="hidden" name="coins" value="0"><input name="gems" type="number" value="50" style="width:78px;padding:6px"><button name="add" value="1" class="g" style="padding:6px 12px">+</button></form></td></tr>
<?php endforeach; if (!$D['rows']) echo '<tr><td colspan="8">কোনো প্লেয়ার পাওয়া যায়নি</td></tr>'; ?></table></div>
<?php $pages = max(1, (int)ceil($D['count'] / $D['per'])); if ($pages > 1): $qs = '?t=users&s=' . urlencode($D['s']) . '&f=' . urlencode($D['f']) . '&pg='; ?>
<div class="pg"><?php for ($i = max(1, $D['page'] - 3); $i <= min($pages, $D['page'] + 3); $i++) echo $i === $D['page'] ? '<span>' . $i . '</span>' : '<a href="' . h($qs . $i) . '">' . $i . '</a>'; ?></div><?php endif; ?></div>

<?php elseif ($tab === 'log'): ?>
<div class="card"><h2>🧾 সর্বশেষ ১০০ লেনদেন</h2><div class="scroll"><table><tr><th>প্লেয়ার</th><th>আইডি</th><th>ধরন</th><th>বিবরণ</th><th>💎</th><th>🪙</th><th>সময়</th></tr>
<?php foreach ($D['log'] as $l) echo '<tr><td>' . h($l['name'] ?? '—') . '</td><td><a href="?t=users&p=' . h($l['player_id']) . '">' . h($l['player_id']) . '</a></td><td>' . h($kindName[$l['kind']] ?? $l['kind']) . '</td><td>' . h($l['item']) . '</td><td class="gem">' . (int)$l['gems'] . '</td><td class="coin">' . (int)$l['coins'] . '</td><td>' . h(date('d M H:i', (int)$l['created_at'])) . '</td></tr>'; ?></table></div></div>

<?php elseif ($tab === 'admins'): ?>
<div class="card"><h2>🔐 অ্যাডমিন তালিকা</h2><div class="scroll"><table><tr><th>ইমেইল</th><th>শেষ লগইন</th><th></th></tr>
<?php foreach ($D['admins'] as $a): ?><tr><td><?= h($a['email']) ?><?= (int)$a['id'] === (int)$_SESSION['aid'] ? ' <span class="pill r">আপনি</span>' : '' ?></td><td><?= h(ago($a['last_login'])) ?></td>
<td><?php if ((int)$a['id'] !== (int)$_SESSION['aid']): ?><form method="post" style="margin:0"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="aid" value="<?= (int)$a['id'] ?>"><button name="deladmin" value="1" class="d" style="padding:5px 12px">মুছুন</button></form><?php endif; ?></td></tr><?php endforeach; ?></table></div></div>
<div class="grid g2">
<div class="card"><h2>➕ নতুন অ্যাডমিন যোগ করুন</h2><form method="post"><input type="hidden" name="csrf" value="<?= $csrf ?>">
<input type="email" name="email" placeholder="ইমেইল" required maxlength="120" style="width:100%"><br><input type="password" name="pw" placeholder="পাসওয়ার্ড (৮+ অক্ষর)" required minlength="8" maxlength="72" style="width:100%" autocomplete="new-password"><br><button name="addadmin" value="1" class="g">যোগ করুন</button></form></div>
<div class="card"><h2>🔑 আমার পাসওয়ার্ড বদলান</h2><form method="post"><input type="hidden" name="csrf" value="<?= $csrf ?>">
<input type="password" name="cur" placeholder="বর্তমান পাসওয়ার্ড" required style="width:100%" autocomplete="current-password"><br><input type="password" name="pw" placeholder="নতুন পাসওয়ার্ড (৮+ অক্ষর)" required minlength="8" maxlength="72" style="width:100%" autocomplete="new-password"><br><button name="chpw" value="1">বদলান</button></form></div>
</div>
<?php endif; ?>
</div>
<?php endif; ?>
</body></html>
