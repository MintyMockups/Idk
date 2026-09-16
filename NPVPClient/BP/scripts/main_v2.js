import { world, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

const VERSION = '2.0.3';
const PREFIX = '§8[§bNPVP§8]§r';
const BOT_ID = 'npvp:pvp_bot';
const PROP = { hud: 'npvp:hud', stats: 'npvp:stats', health: 'npvp:auto_health' };
const DEFAULTS = { hud: true, stats: true, health: true };

function bool(p, key) { const v = p.getDynamicProperty(key); return v === undefined ? DEFAULTS[key] : !!v; }
function setBool(p, key, v) { p.setDynamicProperty(key, !!v); }
function stats(p) { return { kills: Number(p.getDynamicProperty('npvp:kills') ?? 0), deaths: Number(p.getDynamicProperty('npvp:deaths') ?? 0), hits: Number(p.getDynamicProperty('npvp:hits') ?? 0) }; }
function save(p, s) { p.setDynamicProperty('npvp:kills', s.kills); p.setDynamicProperty('npvp:deaths', s.deaths); p.setDynamicProperty('npvp:hits', s.hits); }
function msg(p, s) { try { p.sendMessage(`${PREFIX} ${s}`); } catch {} }
function bots(p) { try { return p.dimension.getEntities({ type: BOT_ID }); } catch { return []; } }
function count(p) { return bots(p).length; }
function showStats(p) { const s = stats(p); const kd = s.deaths ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2); msg(p, `§b§lSTATS§r Kills: §f${s.kills} §7| Deaths: §f${s.deaths} §7| K/D: §f${kd} §7| Hits: §f${s.hits}`); }

function spawnBot(p, difficulty = 'medium') {
  try {
    const loc = p.location, dir = p.getViewDirection();
    const e = p.dimension.spawnEntity(BOT_ID, { x: loc.x + dir.x * 3, y: loc.y, z: loc.z + dir.z * 3 });
    const event = difficulty === 'easy' ? 'set_easy' : difficulty === 'hard' ? 'set_hard' : 'set_medium';
    try { e.triggerEvent(event); } catch {}
    msg(p, `PvP bot spawned (§f${difficulty}§r).`);
  } catch (e) { msg(p, `Bot spawn failed: §7${e?.message ?? 'entity unavailable'}`); }
}
function spawnDummy(p) {
  try {
    const loc = p.location, dir = p.getViewDirection();
    const e = p.dimension.spawnEntity(BOT_ID, { x: loc.x + dir.x * 3, y: loc.y, z: loc.z + dir.z * 3 });
    try { e.triggerEvent('set_dummy'); } catch {}
    msg(p, 'Practice dummy spawned.');
  } catch (e) { msg(p, `Dummy spawn failed: §7${e?.message ?? 'entity unavailable'}`); }
}
function clear(p) { let n = 0; for (const e of bots(p)) { try { e.remove(); n++; } catch {} } msg(p, `Removed §f${n}§r NPVP entities.`); }
function help(p) { msg(p, '§b!npvp open §7| §fhelp §7| §fsettings §7| §fbots §7| §fspawn [easy|medium|hard] §7| §fdummy §7| §fclear §7| §fstats §7| §fhud [on|off] §7| §ftoggle <hud|stats|health> <on|off> §7| §freset §7| §fversion'); }

async function settings(p) {
  try {
    const form = new ActionFormData()
      .title('NPVP • Settings')
      .body(`§7Combat HUD: ${bool(p, PROP.hud) ? '§aON' : '§cOFF'}\n§7Statistics: ${bool(p, PROP.stats) ? '§aON' : '§cOFF'}\n§7Auto health: ${bool(p, PROP.health) ? '§aON' : '§cOFF'}`)
      .button(`HUD: ${bool(p, PROP.hud) ? 'ON' : 'OFF'}`)
      .button(`Stats: ${bool(p, PROP.stats) ? 'ON' : 'OFF'}`)
      .button(`Health: ${bool(p, PROP.health) ? 'ON' : 'OFF'}`)
      .button('Reset settings')
      .button('Back');
    const r = await form.show(p);
    if (r.canceled) return;
    if (r.selection === 0) { setBool(p, PROP.hud, !bool(p, PROP.hud)); return settings(p); }
    if (r.selection === 1) { setBool(p, PROP.stats, !bool(p, PROP.stats)); return settings(p); }
    if (r.selection === 2) { setBool(p, PROP.health, !bool(p, PROP.health)); return settings(p); }
    if (r.selection === 3) { for (const [k,v] of Object.entries(DEFAULTS)) setBool(p, PROP[k], v); return settings(p); }
    if (r.selection === 4) return openMenu(p);
  } catch (e) { msg(p, `Settings UI error: §7${e?.message ?? e}`); }
}

async function openMenu(p) {
  try {
    const form = new ActionFormData()
      .title(`NPVP Client v${VERSION}`)
      .body(`§7Bots: §b${count(p)}\n§7HUD: §a${bool(p, PROP.hud) ? 'ON' : 'OFF'}\n§7Stats: §a${bool(p, PROP.stats) ? 'ON' : 'OFF'}`)
      .button('Spawn Bot')
      .button('Practice Dummy')
      .button('Clear')
      .button('Stats')
      .button('Settings')
      .button('Help');
    const r = await form.show(p);
    if (r.canceled) return;
    if (r.selection === 0) spawnBot(p);
    else if (r.selection === 1) spawnDummy(p);
    else if (r.selection === 2) clear(p);
    else if (r.selection === 3) showStats(p);
    else if (r.selection === 4) settings(p);
    else if (r.selection === 5) help(p);
  } catch (e) { msg(p, `Menu UI error: §7${e?.message ?? e}`); }
}

function parse(v) { if (['on','true','1'].includes(v)) return true; if (['off','false','0'].includes(v)) return false; return null; }
function command(p, text) {
  const a = text.trim().split(/\s+/); if (a.shift()?.toLowerCase() !== '!npvp') return false;
  const c = (a.shift() ?? 'help').toLowerCase();
  if (c === 'open' || c === 'menu') openMenu(p);
  else if (c === 'help' || c === '?') help(p);
  else if (c === 'settings' || c === 'config') settings(p);
  else if (c === 'bots') msg(p, `Active bots: §f${count(p)}`);
  else if (c === 'spawn') spawnBot(p, ['easy','medium','hard'].includes(a[0]?.toLowerCase()) ? a[0].toLowerCase() : 'medium');
  else if (c === 'dummy' || c === 'target') spawnDummy(p);
  else if (c === 'clear' || c === 'remove') clear(p);
  else if (c === 'stats') showStats(p);
  else if (c === 'hud') { const v = parse(a[0]?.toLowerCase()); if (v === null) msg(p, `HUD: §f${bool(p, PROP.hud) ? 'ON' : 'OFF'}`); else { setBool(p, PROP.hud, v); msg(p, `HUD ${v ? 'enabled' : 'disabled'}.`); } }
  else if (c === 'toggle') { const map = { hud: PROP.hud, stats: PROP.stats, health: PROP.health }, v = parse(a[1]?.toLowerCase()); if (!map[a[0]] || v === null) msg(p, 'Usage: !npvp toggle <hud|stats|health> <on|off>'); else { setBool(p, map[a[0]], v); msg(p, `${a[0]} ${v ? 'enabled' : 'disabled'}.`); } }
  else if (c === 'reset') { for (const [k,v] of Object.entries(DEFAULTS)) setBool(p, PROP[k], v); msg(p, 'Settings reset.'); }
  else if (c === 'version') msg(p, `NPVP Client §bv${VERSION}`);
  else msg(p, 'Unknown command. Use !npvp help');
  return true;
}

function handleChat(e) {
  const m = typeof e.message === 'string' ? e.message.trim() : '';
  if (!m.toLowerCase().startsWith('!npvp')) return;
  if (e.cancel !== undefined) e.cancel = true;
  const p = e.sender; if (!p) return;
  system.run(() => { try { command(p, m); } catch (err) { msg(p, `Command error: §7${err?.message ?? err}`); } });
}

if (world.beforeEvents?.chatSend?.subscribe) world.beforeEvents.chatSend.subscribe(handleChat);
else if (world.afterEvents?.chatSend?.subscribe) world.afterEvents.chatSend.subscribe(handleChat);

if (world.afterEvents?.playerSpawn?.subscribe) world.afterEvents.playerSpawn.subscribe(e => { if (!e.initialSpawn) return; system.runTimeout(() => msg(e.player, `NPVP Client §bv${VERSION}§r loaded. Use §f!npvp open§r.`), 20); });
if (world.afterEvents?.entityHitEntity?.subscribe) world.afterEvents.entityHitEntity.subscribe(e => { const p = e.damagingEntity; if (!p || p.typeId !== 'minecraft:player' || !bool(p, PROP.stats)) return; const s = stats(p); s.hits++; save(p, s); });
if (world.afterEvents?.entityDie?.subscribe) world.afterEvents.entityDie.subscribe(e => { const d = e.deadEntity; if (!d) return; if (d.typeId === 'minecraft:player') { const s = stats(d); s.deaths++; save(d, s); } const k = e.damageSource?.damagingEntity; if (k?.typeId === 'minecraft:player' && d.typeId === BOT_ID) { const s = stats(k); s.kills++; save(k, s); } });
system.runInterval(() => { for (const p of world.getPlayers()) { if (!bool(p, PROP.hud)) continue; const s = stats(p); try { p.onScreenDisplay.setActionBar(`§bNPVP §8• §fBots §b${count(p)} §8• §fK/D §b${s.kills}/${s.deaths}`); } catch {} } }, 10);
