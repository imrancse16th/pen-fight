package edu.kyau.penfight;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Context;
import android.net.wifi.WifiManager;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InterfaceAddress;
import java.net.SocketTimeoutException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * "Nearby" mode: this phone hosts ONE room on the local network (Wi-Fi or its own hotspot), no internet needed.
 * Same JSON protocol as server/room-server.js (create / join / setpen / start / relay / leave).
 */
@CapacitorPlugin(name = "LanServer")
public class LanServerPlugin extends Plugin {
  private Srv server;
  private volatile boolean beacon = false;
  static final int DISCOVERY_PORT = 8766;

  @PluginMethod
  public void start(PluginCall call) {
    int port = call.getInt("port", 8765);
    try {
      stopServer();
      server = new Srv(new InetSocketAddress(port));
      server.setReuseAddr(true);
      server.setConnectionLostTimeout(20);
      server.start();
      startBeacon(port);
      JSObject r = new JSObject();
      r.put("ip", localIp());
      r.put("port", port);
      call.resolve(r);
    } catch (Exception e) {
      call.reject("start_failed: " + e.getMessage());
    }
  }

  /** Listens for nearby hosts (UDP broadcasts) for `ms` milliseconds. */
  @PluginMethod
  public void discover(final PluginCall call) {
    final int ms = call.getInt("ms", 2500);
    new Thread(() -> {
      WifiManager.MulticastLock lock = null;
      DatagramSocket sock = null;
      JSArray list = new JSArray();
      try {
        WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm != null) { lock = wm.createMulticastLock("penfight"); lock.setReferenceCounted(false); lock.acquire(); }
        sock = new DatagramSocket(null); sock.setReuseAddress(true); sock.bind(new InetSocketAddress(DISCOVERY_PORT));
        long end = System.currentTimeMillis() + ms; byte[] buf = new byte[1024]; java.util.HashSet<String> seen = new java.util.HashSet<>();
        while (System.currentTimeMillis() < end) {
          try {
            sock.setSoTimeout((int) Math.max(50, end - System.currentTimeMillis()));
            DatagramPacket p = new DatagramPacket(buf, buf.length); sock.receive(p);
            JSONObject o = new JSONObject(new String(p.getData(), 0, p.getLength(), "UTF-8"));
            if (!"penfight".equals(o.optString("g"))) continue;
            String ip = p.getAddress().getHostAddress(); if (!seen.add(ip)) continue;
            o.put("ip", ip); list.put(o);
          } catch (SocketTimeoutException e) { break; } catch (Exception e) { }
        }
      } catch (Exception e) { }
      finally { try { if (sock != null) sock.close(); } catch (Exception e) { } if (lock != null && lock.isHeld()) lock.release(); }
      JSObject r = new JSObject(); r.put("hosts", list); call.resolve(r);
    }).start();
  }

  /** Host side: announce this room every second to everyone on the local network. */
  private void startBeacon(final int port) {
    beacon = true;
    final Srv srv = server;
    new Thread(() -> {
      DatagramSocket sock = null;
      try {
        sock = new DatagramSocket(); sock.setBroadcast(true);
        while (beacon && server == srv) {
          byte[] b = srv.beaconJson(port).getBytes("UTF-8");
          List<InetAddress> targets = new ArrayList<>();
          try { targets.add(InetAddress.getByName("255.255.255.255")); } catch (Exception e) { }
          for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (!ni.isUp() || ni.isLoopback()) continue;
            for (InterfaceAddress ia : ni.getInterfaceAddresses()) if (ia.getBroadcast() != null) targets.add(ia.getBroadcast());
          }
          for (InetAddress t : targets) { try { sock.send(new DatagramPacket(b, b.length, t, DISCOVERY_PORT)); } catch (Exception e) { } }
          Thread.sleep(1000);
        }
      } catch (Exception e) { }
      finally { if (sock != null) sock.close(); }
    }).start();
  }

  @PluginMethod
  public void stop(PluginCall call) { stopServer(); call.resolve(); }

  @PluginMethod
  public void ip(PluginCall call) { JSObject r = new JSObject(); r.put("ip", localIp()); call.resolve(r); }

  @Override
  protected void handleOnDestroy() { stopServer(); }

  private void stopServer() {
    beacon = false;
    if (server != null) { try { server.stop(200); } catch (Exception e) { } server = null; }
  }

  /** Wi-Fi address, or the hotspot address when this phone is the hotspot. */
  private String localIp() {
    try {
      String best = "";
      for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
        if (!ni.isUp() || ni.isLoopback()) continue;
        String n = ni.getName().toLowerCase();
        for (InetAddress a : Collections.list(ni.getInetAddresses())) {
          if (!(a instanceof Inet4Address) || a.isLoopbackAddress()) continue;
          String ip = a.getHostAddress();
          if (n.startsWith("wlan") || n.startsWith("ap") || n.startsWith("swlan") || n.startsWith("eth")) return ip;
          if (best.isEmpty() && !n.startsWith("rmnet") && !n.startsWith("ccmni") && !n.startsWith("dummy")) best = ip;
        }
      }
      return best;
    } catch (Exception e) { return ""; }
  }

  // ---------- the room server (one room) ----------
  static class Member { WebSocket ws; String name = "Player", av = "boy", penId = "blue"; boolean ghost; }

  static class Srv extends WebSocketServer {
    static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    final List<Member> members = new ArrayList<>();
    String id = "", pass = "", arena = "classroom";
    int max = 4, time = 120, level = 1;
    boolean started = false, open = false;

    Srv(InetSocketAddress a) { super(a); }

    synchronized String beaconJson(int port) {
      try {
        String host = members.isEmpty() ? "" : members.get(0).name;
        return new JSONObject().put("g", "penfight").put("port", port).put("host", host).put("id", id).put("n", members.size())
          .put("max", max).put("pass", !pass.isEmpty()).put("started", started).put("open", open).toString();
      } catch (Exception e) { return "{}"; }
    }

    @Override public void onOpen(WebSocket c, ClientHandshake h) { }
    @Override public void onStart() { }
    @Override public void onError(WebSocket c, Exception e) { }
    @Override public void onClose(WebSocket c, int code, String reason, boolean remote) { synchronized (this) { leave(c); } }

    private Member of(WebSocket c) { for (Member m : members) if (m.ws == c) return m; return null; }
    private void send(WebSocket c, JSONObject o) { try { if (c != null && c.isOpen()) c.send(o.toString()); } catch (Exception e) { } }
    private JSONArray lobbyArr() throws Exception {
      JSONArray a = new JSONArray();
      for (int i = 0; i < members.size(); i++) {
        Member m = members.get(i);
        a.put(new JSONObject().put("i", i).put("name", m.name).put("av", m.av).put("penId", m.penId).put("host", i == 0));
      }
      return a;
    }
    private void pushLobby() throws Exception {
      for (int i = 0; i < members.size(); i++) {
        Member m = members.get(i); if (m.ghost) continue;
        send(m.ws, new JSONObject().put("t", "lobby").put("id", id).put("you", i).put("max", max).put("time", time).put("arena", arena)
          .put("level", level).put("hasPass", !pass.isEmpty()).put("players", lobbyArr()).put("started", started));
      }
    }
    private void leave(WebSocket c) {
      try {
        Member me = of(c); if (me == null) return;
        int idx = members.indexOf(me);
        if (idx == 0) {
          for (Member m : members) if (m != me && !m.ghost) send(m.ws, new JSONObject().put("t", "closed").put("reason", "host_left"));
          members.clear(); open = false; started = false; return;
        }
        if (started) {
          me.ghost = true; me.ws = null;
          for (Member m : members) if (m != me && !m.ghost) send(m.ws, new JSONObject().put("t", "left").put("i", idx).put("name", me.name));
        } else { members.remove(me); pushLobby(); }
      } catch (Exception e) { }
    }

    @Override public synchronized void onMessage(WebSocket c, String raw) {
      try {
        JSONObject m = new JSONObject(raw);
        String t = m.optString("t");
        String name = m.optString("name", "Player"); if (name.length() > 14) name = name.substring(0, 14);
        switch (t) {
          case "create": {
            leave(c);
            if (open) { send(c, new JSONObject().put("t", "err").put("code", "busy")); return; }
            members.clear(); started = false; open = true;
            StringBuilder sb = new StringBuilder(); Random rnd = new Random();
            for (int i = 0; i < 5; i++) sb.append(CHARS.charAt(rnd.nextInt(CHARS.length())));
            id = sb.toString();
            pass = m.optString("pass", ""); if (pass.length() > 12) pass = pass.substring(0, 12);
            max = Math.min(5, Math.max(2, m.optInt("max", 4)));
            time = m.optInt("time", 120); arena = m.optString("arena", "classroom"); level = m.optInt("level", 1);
            Member me = new Member(); me.ws = c; me.name = name; me.av = m.optString("av", "boy"); me.penId = m.optString("penId", "blue");
            members.add(me);
            send(c, new JSONObject().put("t", "created").put("id", id).put("pass", pass));
            pushLobby(); break;
          }
          case "join": {
            String want = m.optString("id", "").toUpperCase().trim();
            if (!open || (!want.isEmpty() && !want.equals(id))) { send(c, new JSONObject().put("t", "err").put("code", "no_room")); return; }
            if (!pass.isEmpty() && !pass.equals(m.optString("pass", ""))) { send(c, new JSONObject().put("t", "err").put("code", "bad_pass")); return; }
            if (started) { send(c, new JSONObject().put("t", "err").put("code", "started")); return; }
            if (members.size() >= max) { send(c, new JSONObject().put("t", "err").put("code", "full")); return; }
            leave(c);
            Member me = new Member(); me.ws = c; me.name = name; me.av = m.optString("av", "girl"); me.penId = m.optString("penId", "blue");
            members.add(me);
            send(c, new JSONObject().put("t", "joined").put("id", id));
            pushLobby(); break;
          }
          case "setpen": { Member me = of(c); if (me != null) { me.penId = m.optString("penId", "blue"); pushLobby(); } break; }
          case "start": {
            Member me = of(c); if (me == null || members.indexOf(me) != 0 || members.size() < 2) return;
            started = true;
            for (int i = 0; i < members.size(); i++) {
              Member p = members.get(i); if (p.ghost) continue;
              send(p.ws, new JSONObject().put("t", "start").put("you", i).put("id", id).put("time", time).put("arena", arena)
                .put("level", level).put("players", lobbyArr()));
            }
            break;
          }
          case "relay": {
            Member me = of(c); if (me == null || members.isEmpty()) return;
            int from = members.indexOf(me);
            JSONObject out = new JSONObject().put("t", "relay").put("from", from).put("d", m.get("d"));
            if ("host".equals(m.optString("to"))) { if (from != 0) send(members.get(0).ws, out); }
            else if (from == 0) { for (Member p : members) if (p != me && !p.ghost) send(p.ws, out); }
            break;
          }
          case "leave": leave(c); break;
          case "ping": send(c, new JSONObject().put("t", "pong")); break;
        }
      } catch (Exception e) { }
    }
  }
}
