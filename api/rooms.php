<?php
// Internet rooms over plain HTTP (works on normal shared hosting; no WebSocket needed).
// Players send actions; everything else is delivered by long-polling room_poll.
const ROOM_ARENAS = 'classroom,campus,library,rooftop';
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function room_id() {
    for ($t = 0; $t < 20; $t++) {
        $id = '';
        for ($i = 0; $i < 5; $i++) $id .= ROOM_CHARS[random_int(0, strlen(ROOM_CHARS) - 1)];
        if (!q('SELECT 1 FROM rooms WHERE id=?', [$id])->fetch()) return $id;
    }
    out(['error' => 'busy'], 503);
}
function push($room, $to, $from, $body) {
    q('INSERT INTO room_msgs (room_id,to_idx,from_idx,body,created_at) VALUES (?,?,?,?,?)', [$room, $to, $from, json_encode($body, JSON_UNESCAPED_UNICODE), time()]);
}
function lobby_body($roomId) {
    $r = q('SELECT * FROM rooms WHERE id=?', [$roomId])->fetch();
    $ms = q('SELECT idx,name,pen_id,av FROM room_members WHERE room_id=? AND gone=0 ORDER BY idx', [$roomId])->fetchAll();
    $players = [];
    foreach ($ms as $m) $players[] = ['i' => (int)$m['idx'], 'name' => $m['name'], 'penId' => $m['pen_id'], 'av' => $m['av'], 'host' => (int)$m['idx'] === 0];
    return ['t' => 'lobby', 'id' => $roomId, 'max' => (int)$r['max_players'], 'time' => (int)$r['time_sec'], 'arena' => $r['arena'], 'level' => (int)$r['level'], 'hasPass' => $r['pass'] !== '', 'started' => (int)$r['started'], 'players' => $players];
}
function push_lobby($roomId) { push($roomId, null, -1, lobby_body($roomId)); }

/** Authenticates a room member (room id + slot + secret) and applies the per-member rate limit. */
function member($q) {
    global $CFG;
    $id = need($q, 'id', 'rid'); $idx = need($q, 'idx', 'int:0:4'); $rt = need($q, 'rt', 'rt');
    $m = q('SELECT * FROM room_members WHERE room_id=? AND idx=?', [$id, $idx])->fetch();
    if (!$m || !hash_equals($m['rt'], $rt)) out(['error' => 'no_room'], 403);
    if ($m['gone']) out(['error' => 'gone'], 410);
    rl_hit('room_io', $id . '-' . $idx, $CFG['limits']['room_io']);
    q('UPDATE room_members SET last_seen=? WHERE room_id=? AND idx=?', [time(), $id, $idx]);
    return [$id, $idx, $m];
}
function room_cleanup() {
    $now = time();
    $ids = q('SELECT id FROM rooms WHERE last_seen<? OR (started=0 AND last_seen<?) OR (closed=1 AND last_seen<?)', [$now - 6 * 3600, $now - 1800, $now - 120])->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ids as $rid) { q('DELETE FROM room_msgs WHERE room_id=?', [$rid]); q('DELETE FROM room_members WHERE room_id=?', [$rid]); q('DELETE FROM rooms WHERE id=?', [$rid]); }
    q('DELETE FROM room_msgs WHERE created_at<?', [$now - 900]);
}
// notice players who stopped polling
function room_watch($roomId) {
    $now = time();
    $r = q('SELECT started,closed FROM rooms WHERE id=?', [$roomId])->fetch();
    if (!$r || $r['closed']) return;
    $stale = q('SELECT idx,name FROM room_members WHERE room_id=? AND gone=0 AND last_seen<?', [$roomId, $now - ($r['started'] ? 30 : 40)])->fetchAll();
    foreach ($stale as $s) {
        if ((int)$s['idx'] === 0) { q('UPDATE rooms SET closed=1,last_seen=? WHERE id=?', [$now, $roomId]); push($roomId, null, -1, ['t' => 'closed', 'reason' => 'host_left']); return; }
        if ($r['started']) { q('UPDATE room_members SET gone=1 WHERE room_id=? AND idx=?', [$roomId, $s['idx']]); push($roomId, null, -1, ['t' => 'left', 'i' => (int)$s['idx'], 'name' => $s['name']]); }
        else { q('DELETE FROM room_members WHERE room_id=? AND idx=?', [$roomId, $s['idx']]); push_lobby($roomId); }
    }
}

function handle_room($a, $q) {
    global $CFG; $L = $CFG['limits'];
    $now = time(); $ip = client_ip();
    switch ($a) {
    case 'room_create': {
        rl_hit('room_create', $ip, $L['room_create']);
        $max = need($q, 'max', 'int:2:5'); $time = need($q, 'time', 'int:30:600');
        $arena = need($q, 'arena', 'enum:' . ROOM_ARENAS); $level = need($q, 'level', 'int:0:2', false, 1);
        $pass = need($q, 'pass', 'rpass', false, ''); $name = need($q, 'name', 'name'); $pen = need($q, 'penId', 'penid', false, 'blue');
        if (mt_rand(1, 10) === 1) room_cleanup();
        $id = room_id(); $rt = rnd(16);
        q('INSERT INTO rooms (id,pass,max_players,time_sec,arena,level,created_at,last_seen) VALUES (?,?,?,?,?,?,?,?)', [$id, $pass, $max, $time, $arena, $level, $now, $now]);
        q('INSERT INTO room_members (room_id,idx,name,pen_id,av,rt,last_seen) VALUES (?,?,?,?,?,?,?)', [$id, 0, $name, $pen, 'boy', $rt, $now]);
        push_lobby($id);
        out(['id' => $id, 'idx' => 0, 'rt' => $rt, 'pass' => $pass]);
    }
    case 'room_join': {
        rl_hit('room_join', $ip, $L['room_join']);
        $id = need($q, 'id', 'rid'); $pass = need($q, 'pass', 'rpass', false, ''); $name = need($q, 'name', 'name'); $pen = need($q, 'penId', 'penid', false, 'blue');
        $r = q('SELECT * FROM rooms WHERE id=?', [$id])->fetch();
        if (!$r || $r['closed']) out(['error' => 'no_room'], 404);
        if ($r['pass'] !== '' && !hash_equals($r['pass'], $pass)) out(['error' => 'bad_pass'], 403);
        if ($r['started']) out(['error' => 'started'], 409);
        $active = (int)q('SELECT COUNT(*) FROM room_members WHERE room_id=? AND gone=0', [$id])->fetchColumn();
        if ($active >= (int)$r['max_players']) out(['error' => 'full'], 409);
        $idx = 1 + (int)q('SELECT COALESCE(MAX(idx),0) FROM room_members WHERE room_id=?', [$id])->fetchColumn();
        if ($idx > 4) out(['error' => 'full'], 409);
        $rt = rnd(16);
        q('INSERT INTO room_members (room_id,idx,name,pen_id,av,rt,last_seen) VALUES (?,?,?,?,?,?,?)', [$id, $idx, $name, $pen, 'girl', $rt, $now]);
        q('UPDATE rooms SET last_seen=? WHERE id=?', [$now, $id]);
        push_lobby($id);
        out(['id' => $id, 'idx' => $idx, 'rt' => $rt]);
    }
    case 'room_setpen': {
        $pen = need($q, 'penId', 'penid');
        [$id, $idx] = member($q);
        q('UPDATE room_members SET pen_id=? WHERE room_id=? AND idx=?', [$pen, $id, $idx]);
        push_lobby($id); out(['ok' => true]);
    }
    case 'room_start': {
        [$id, $idx] = member($q);
        if ($idx !== 0) out(['error' => 'not_host'], 403);
        $r = q('SELECT * FROM rooms WHERE id=?', [$id])->fetch();
        if ($r['started']) out(['ok' => true]);
        $pdo = db(); $pdo->beginTransaction();
        try {
            q('DELETE FROM room_members WHERE room_id=? AND gone=1', [$id]);
            $ms = q('SELECT idx,name,pen_id,av FROM room_members WHERE room_id=? ORDER BY idx FOR UPDATE', [$id])->fetchAll();
            if (count($ms) < 2) { $pdo->rollBack(); out(['error' => 'few'], 409); }
            q('UPDATE room_members SET idx=idx+100 WHERE room_id=?', [$id]);
            $players = [];
            foreach ($ms as $k => $m) { q('UPDATE room_members SET idx=? WHERE room_id=? AND idx=?', [$k, $id, (int)$m['idx'] + 100]); $players[] = ['i' => $k, 'name' => $m['name'], 'penId' => $m['pen_id'], 'av' => $m['av'], 'host' => $k === 0]; }
            q('UPDATE rooms SET started=1,last_seen=? WHERE id=?', [$now, $id]);
            $pdo->commit();
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
        foreach ($players as $p) push($id, $p['i'], -1, ['t' => 'start', 'you' => $p['i'], 'id' => $id, 'time' => (int)$r['time_sec'], 'arena' => $r['arena'], 'level' => (int)$r['level'], 'players' => $players]);
        out(['ok' => true]);
    }
    case 'room_send': {
        $d = need($q, 'd', 'arr'); $to = need($q, 'to', 'enum:host,all', false, 'all');
        if (strlen(json_encode($d)) > 20000) out(['error' => 'too_big'], 413);
        if (isset($d['k']) && (!is_string($d['k']) || !preg_match('/^[a-z]{1,12}$/', $d['k']))) out(['error' => 'invalid', 'field' => 'd'], 422);
        [$id, $idx] = member($q);
        if ($to === 'host') { if ($idx !== 0) push($id, 0, $idx, ['t' => 'relay', 'from' => $idx, 'd' => $d]); out(['ok' => true]); }
        if ($idx !== 0) out(['error' => 'not_host'], 403);
        if (($d['k'] ?? '') === 'snap') { q('UPDATE rooms SET snap=?, snap_seq=snap_seq+1, last_seen=? WHERE id=?', [json_encode($d), $now, $id]); out(['ok' => true]); }
        push($id, null, 0, ['t' => 'relay', 'from' => 0, 'd' => $d]); out(['ok' => true]);
    }
    case 'room_poll': {
        $since = need($q, 'since', 'int:0:999999999', false, 0); $snapSeq = need($q, 'snapseq', 'int:0:999999999', false, 0); $wait = need($q, 'wait', 'int:0:6500', false, 0);
        [$id, $idx] = member($q);
        @set_time_limit(30);
        room_watch($id);
        $t0 = microtime(true);
        while (true) {
            $msgs = q('SELECT seq,body FROM room_msgs WHERE room_id=? AND seq>? AND ((to_idx IS NULL AND from_idx<>?) OR to_idx=?) ORDER BY seq LIMIT 100', [$id, $since, $idx, $idx])->fetchAll();
            $snap = null;
            if ($idx !== 0) {
                $r = q('SELECT snap,snap_seq FROM rooms WHERE id=?', [$id])->fetch();
                if ($r && (int)$r['snap_seq'] > $snapSeq && $r['snap']) $snap = ['seq' => (int)$r['snap_seq'], 'd' => json_decode($r['snap'], true)];
            }
            if ($msgs || $snap || (microtime(true) - $t0) * 1000 >= $wait || connection_aborted()) break;
            usleep(50000);
        }
        $list = [];
        foreach ($msgs as $m) $list[] = ['seq' => (int)$m['seq'], 'm' => json_decode($m['body'], true)];
        out(['msgs' => $list, 'snap' => $snap]);
    }
    case 'room_leave': {
        $id = need($q, 'id', 'rid'); $idx = need($q, 'idx', 'int:0:4'); $rt = need($q, 'rt', 'rt');
        $m = q('SELECT * FROM room_members WHERE room_id=? AND idx=?', [$id, $idx])->fetch();
        if (!$m || !hash_equals($m['rt'], $rt)) out(['ok' => true]);
        $r = q('SELECT started FROM rooms WHERE id=?', [$id])->fetch();
        if ($idx === 0) { q('UPDATE rooms SET closed=1,last_seen=? WHERE id=?', [$now, $id]); push($id, null, -1, ['t' => 'closed', 'reason' => 'host_left']); }
        elseif ($r && $r['started']) { q('UPDATE room_members SET gone=1 WHERE room_id=? AND idx=?', [$id, $idx]); push($id, null, -1, ['t' => 'left', 'i' => $idx, 'name' => $m['name']]); }
        else { q('DELETE FROM room_members WHERE room_id=? AND idx=?', [$id, $idx]); push_lobby($id); }
        out(['ok' => true]);
    }
    }
    out(['error' => 'unknown_action'], 400);
}
