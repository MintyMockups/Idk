import { world, system } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { spawnPvPBot, spawnPracticeDummy, removeAllBots } from './bot_controller.js';

const VERSION = '2.0.1';
const PREFIX = '§8[§bNPVP§8]§r';
const PROP = {
  hud: 'npvp:hud',
  stats: 'npvp:stats',
  autoHealth: 'npvp:auto_health',
  bots: 'npvp:bots'
};
const defaults = { hud: true, stats: true, autoHealth: true, bots: 0 };

function getBool(player, key) {
  const value = player.getDynamicProperty(key);
  return value === undefined ? defaults[key] : !!value;
}
function setBool(player, key, value) { player.setDynamicProperty(key, !!value); }
function getStats(player) {
  return {
    kills: Number(player.getDynamicProperty('npvp:kills') ?? 0),
    deaths: Number(player.getDynamicProperty('npvp:deaths') ?? 0),
    hits: Number(player.getDynamicProperty('npvp:hits') ?? 0),
    sessions: Number(player.getDynamicProperty('npvp:sessions') ?? 0)
  };
}
function saveStats(player, stats) {
  player.setDynamicProperty('npvp:kills', stats.kills);
  player.setDynamicProperty('npvp:deaths', stats.deaths);
  player.setDynamicProperty('npvp:hits', stats.hits);
}
function msg(player, text) { try { player.sendMessage(`${PREFIX} ${text}`); } catch {} }
function tell(player, text) { try { player.sendMessage(text); } catch {} }
function botEntities(player) {
  try { return player.dimension.getEntities({ type: 'npvp:pvp_bot' }); }
  catch { try { return player.dimension.getEntities({ type: 'verxhade:pvp_bot' }); } catch { return []; } }
}
function refreshBotCount(player) {
  const count = botEntities(player).length;
  player.setDynamicProperty(PROP.bots, count);
  return count;
}
function showStats(player) {
  const s = getStats(player);
  const kd = s.deaths === 0 ? s.kills.toFixed(2) : (s.kills / s.deaths).toFixed(2);
  const accuracyBase = s.hits + s.deaths;
  const accuracy = accuracyBase === 0 ? 0 : Math.min(100, Math.round((s.hits / accuracyBase) * 100));
  tell(player, `§b§lNPVP STATS§r\n§7Kills: §f${s.kills}\n§7Deaths: §f${s.deaths}\n§7K/D: §f${kd}\n§7Hits: §f${s.hits}\n§7Combat index: §f${accuracy}%`);
}
async function openSettings(player) {
  const form = new ModalFormData().title('NPVP • Settings')
    .toggle('Combat HUD', getBool(player, PROP.hud))
    .toggle('Combat statistics', getBool(player, PROP.stats))
    .toggle('Automatic bot health display', getBool(player, PROP.autoHealth));
  try {
    const result = await form.show(player);
    if (result.canceled || !result.formValues) return;
    setBool(player, PROP.hud, !!result.formValues[0]);
    setBool(player, PROP.stats, !!result.formValues[1]);
    setBool(player, PROP.autoHealth, !!result.formValues[2]);
    msg(player, 'Settings saved.');
  } catch { msg(player, 'Could not open settings.'); }
}
async function openMenu(player) {
  const count = refreshBotCount(player);
  const form = new ActionFormData().title('NPVP Client • v2')
    .body(`§7Command-driven PvP utility\n§8────────────────\n§fBots: §b${count}\n§fHUD: §a${getBool(player, PROP.hud) ? 'ON' : 'OFF'}\n§fStats: §a${getBool(player, PROP.stats) ? 'ON' : 'OFF'}`)
    .button('⚔ Spawn Bot').button('🎯 Practice Dummy').button('🧹 Clear Bots')
    .button('📊 Stats').button('⚙ Settings').button('❓ Help');
  try {
    const result = await form.show(player);
    if (result.canceled) return;
    if (result.selection === 0) return spawnBot(player, 'medium');
    if (result.selection === 1) return spawnDummy(player);
    if (result.selection === 2) return clearBots(player);
    if (result.selection === 3) return showStats(player);
    if (result.selection === 4) return openSettings(player);
    if (result.selection === 5) return help(player);
  } catch {}
}
function spawnBot(player, difficulty = 'medium') {
  try { spawnPvPBot(player, difficulty); system.runTimeout(() => refreshBotCount(player), 2); msg(player, `PvP bot spawned §7(${difficulty}).`); }
  catch { msg(player, 'Bot spawn failed. Check the bot entity/pack version.'); }
}
function spawnDummy(player) { try { spawnPracticeDummy(player); msg(player, 'Practice dummy spawned.'); } catch { msg(player, 'Dummy spawn failed.'); } }
function clearBots(player) { try { removeAllBots(); player.setDynamicProperty(PROP.bots, 0); msg(player, 'All NPVP bots cleared.'); } catch { msg(player, 'Could not clear bots.'); } }
function help(player) { tell(player, `§b§lNPVP COMMANDS§r\n§f!npvp open §7- open client menu\n§f!npvp help §7- show commands\n§f!npvp settings §7- configure client\n§f!npvp bots §7- show active bots\n§f!npvp spawn [easy|medium|hard] §7- spawn bot\n§f!npvp dummy §7- spawn practice dummy\n§f!npvp clear §7- remove all bots\n§f!npvp stats §7- show PvP stats\n§f!npvp hud [on|off] §7- toggle HUD\n§f!npvp toggle <hud|stats|health> [on|off]\n§f!npvp reset §7- reset NPVP settings\n§f!npvp version §7- show version`); }
function setHud(player, value) { setBool(player, PROP.hud, value); msg(player, `HUD ${value ? 'enabled' : 'disabled'}.`); }
function reset(player) { setBool(player, PROP.hud, defaults.hud); setBool(player, PROP.stats, defaults.stats); setBool(player, PROP.autoHealth, defaults.autoHealth); msg(player, 'NPVP settings reset to defaults.'); }
function parseBool(value) { if (value === 'on' || value === 'true' || value === '1') return true; if (value === 'off' || value === 'false' || value === '0') return false; return null; }
function runCommand(player, raw) {
  const args = raw.trim().split(/\s+/); if (args.shift()?.toLowerCase() !== '!npvp') return false;
  const command = (args.shift() ?? 'help').toLowerCase();
  switch (command) {
    case 'open': openMenu(player); return true;
    case 'help': case '?': help(player); return true;
    case 'settings': case 'config': openSettings(player); return true;
    case 'bots': msg(player, `Active bots: §f${refreshBotCount(player)}`); return true;
    case 'spawn': spawnBot(player, ['easy', 'medium', 'hard'].includes(args[0]?.toLowerCase()) ? args[0].toLowerCase() : 'medium'); return true;
    case 'dummy': case 'target': spawnDummy(player); return true;
    case 'clear': case 'remove': clearBots(player); return true;
    case 'stats': showStats(player); return true;
    case 'hud': { const value = parseBool(args[0]?.toLowerCase()); if (value === null) msg(player, `HUD is currently ${getBool(player, PROP.hud) ? 'ON' : 'OFF'}. Use §f!npvp hud on§r or §f!npvp hud off§r.`); else setHud(player, value); return true; }
    case 'toggle': { const module = args[0]?.toLowerCase(); const value = parseBool(args[1]?.toLowerCase()); const map = { hud: PROP.hud, stats: PROP.stats, health: PROP.autoHealth, autohealth: PROP.autoHealth }; if (!map[module] || value === null) { msg(player, 'Usage: !npvp toggle <hud|stats|health> <on|off>'); return true; } setBool(player, map[module], value); msg(player, `${module} ${value ? 'enabled' : 'disabled'}.`); return true; }
    case 'reset': reset(player); return true;
    case 'version': msg(player, `NPVP Client §b${VERSION}§r • command edition`); return true;
    case 'info': msg(player, 'NPVP Client is a PvP practice utility with bots, targets, HUD and persistent settings.'); return true;
    default: msg(player, `Unknown command §f${command}§r. Use §f!npvp help§r.`); return true;
  }
}

world.beforeEvents.chatSend.subscribe((event) => {
  const message = event.message?.trim();
  if (!message?.toLowerCase().startsWith('!npvp')) return;
  event.cancel = true;
  runCommand(event.sender, message);
});

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  const player = event.player;
  player.setDynamicProperty('npvp:sessions', Number(player.getDynamicProperty('npvp:sessions') ?? 0) + 1);
  system.runTimeout(() => msg(player, `NPVP Client §bv${VERSION}§r loaded. Use §f!npvp open§r.`), 20);
});

// Some Bedrock API versions do not expose every afterEvents signal. Guard the
// event object before accessing .subscribe instead of using optional chaining
// on .subscribe itself (which still attempts to call undefined).
const afterEvents = world.afterEvents;
if (afterEvents && afterEvents.entityHitEntity) {
  afterEvents.entityHitEntity.subscribe((event) => {
    const attacker = event.damagingEntity;
    if (!attacker || attacker.typeId !== 'minecraft:player' || !getBool(attacker, PROP.stats)) return;
    const stats = getStats(attacker); stats.hits++; saveStats(attacker, stats);
  });
}
if (afterEvents && afterEvents.entityDie) {
  afterEvents.entityDie.subscribe((event) => {
    const dead = event.deadEntity; if (!dead) return;
    if (dead.typeId === 'minecraft:player') { const stats = getStats(dead); stats.deaths++; saveStats(dead, stats); }
    const killer = event.damageSource?.damagingEntity;
    if (killer?.typeId === 'minecraft:player' && dead.typeId !== 'minecraft:player') { const stats = getStats(killer); stats.kills++; saveStats(killer, stats); }
  });
}

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (!getBool(player, PROP.hud)) continue;
    const bots = refreshBotCount(player); const stats = getStats(player);
    try { player.onScreenDisplay.setActionBar(`§bNPVP §8• §fBots §b${bots} §8• §fK/D §b${stats.kills}/${stats.deaths}`); } catch {}
  }
}, 10);
