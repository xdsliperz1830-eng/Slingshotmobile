// End-to-end verification for the horseshoe game.
// Stubs DOM + canvas, then drives the REAL event handlers and physics.
//
//   node tools/verify.js [path/to/index.html]
//
// No dependencies. Exits non-zero if any check fails.
const fs = require('fs');
const path = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
let js = fs.readFileSync(path, 'utf8').split('<script>')[1].split('</script>')[0];
js = js.replace('const state = {', 'const state = global.__state = {');
js = js.replace('const CONFIG = {', 'const CONFIG = global.__CONFIG = {');
js = js.replace('const view = {', 'const view = global.__view = {');
js = js.replace('  function predictPath(', '  global.__predictPath = predictPath;\n  function predictPath(');
js = js.replace('  function render() {', '  global.__render = render;\n  function render() {');

const noop = () => {};
const drawn = [];
function makeCtx() {
  return new Proxy({
    createLinearGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 10 }),
    setTransform: noop, setLineDash: noop,
    fillText: t => drawn.push(String(t)),
    strokeText: t => drawn.push(String(t)),
  }, { get(t, p) { return p in t ? t[p] : noop; }, set() { return true; } });
}
function makeET(x = {}) {
  const m = {};
  return Object.assign({
    addEventListener: (t, f) => { (m[t] = m[t] || []).push(f); },
    removeEventListener: noop,
    __fire: (t, e) => { (m[t] || []).forEach(f => f(e)); },
  }, x);
}
const ctx = makeCtx();
let VW = 390, VH = 844;
const canvas = makeET({
  width: 0, height: 0, style: {}, getContext: () => ctx,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: VW, height: VH }),
});
global.window = makeET({ innerWidth: VW, innerHeight: VH, devicePixelRatio: 2 });
global.document = makeET({ getElementById: () => canvas });
global.navigator = { vibrate: () => true };
let rafCb = null;
global.requestAnimationFrame = cb => { rafCb = cb; return 1; };
const pend = [];
global.setTimeout = fn => { pend.push(fn); return 1; };

let bootErr = null;
try { (0, eval)(js); } catch (e) { bootErr = e; }

let pass = 0, fail = 0;
const ok = (n, c, extra) => {
  c ? (pass++, console.log('  PASS ' + n))
    : (fail++, console.log('  FAIL ' + n + (extra ? '  -> ' + extra : '')));
};

console.log('\n[1] Boot & render');
ok('no exceptions on load', !bootErr, bootErr && bootErr.message);
if (bootErr) { console.log(bootErr.stack); process.exit(1); }
let now = 0;
function step(n = 1) { for (let i = 0; i < n; i++) { now += 16.67; const c = rafCb; rafCb = null; c(now); } }
let rErr = null; try { step(2); } catch (e) { rErr = e; }
ok('renders frames without error', !rErr, rErr && rErr.message);

const S = global.__state, C = global.__CONFIG, V = global.__view;
const btn = label => S.buttons.find(b => new RegExp(label, 'i').test(b.label));
function tap(b) { canvas.__fire('mousedown', { clientX: b.x + b.w / 2, clientY: b.y + b.h / 2, preventDefault: noop }); }

console.log('\n[2] Start screen');
drawn.length = 0; step(1);
ok('shows title', drawn.some(t => /HORSESHOE/.test(t)));
ok('shows PLAY button', !!btn('PLAY'));

console.log('\n[3] PLAY -> game');
tap(btn('PLAY')); drawn.length = 0; step(1);
ok('screen == game', S.screen === 'game');
ok('HUD shows score', drawn.some(t => /Score:/.test(t)));
ok('round counter incremented', S.round === 1);
ok('throwsLeft == ' + C.throwsPerRound, S.throwsLeft === C.throwsPerRound);

console.log('\n[4] Aiming: arrow, power meter, trajectory preview');
canvas.__fire('mousedown', { clientX: VW / 2, clientY: VH * 0.7, preventDefault: noop });
window.__fire('mousemove', { clientX: VW / 2, clientY: VH * 0.7 + 140, preventDefault: noop });
drawn.length = 0; step(1);
ok('power meter visible', drawn.some(t => /POWER/.test(t)));
ok('trajectory preview computed', !!S.preview && S.preview.pts.length > 3);
const previewLand = S.preview && { d: S.preview.land.d, x: S.preview.land.x };
window.__fire('mouseup', { clientX: VW / 2, clientY: VH * 0.7 + 140, preventDefault: noop });
for (let i = 0; i < 600 && S.shoe; i++) step(1);
const actual = S.landedShoes[S.landedShoes.length - 1];
ok('preview landing matches actual flight',
  previewLand && Math.abs(previewLand.d - actual.d) < 1e-9 && Math.abs(previewLand.x - actual.x) < 1e-9,
  previewLand && `preview d=${previewLand.d} actual d=${actual.d}`);
ok('preview cleared after release', S.preview === null);

// ---- helpers for deterministic throws ----
function reset(wind) {
  S.screen = 'game'; S.throwsLeft = 99; S.roundScore = 0; S.landedShoes = [];
  S.shoe = null; S.popups = []; S.puffs = []; S.aiming = false; S.preview = null;
  S.wind = wind || 0;
}
function thr(back, side, wind) {
  reset(wind);
  const sx = VW / 2, sy = VH * 0.7;
  canvas.__fire('mousedown', { clientX: sx, clientY: sy, preventDefault: noop });
  window.__fire('mousemove', { clientX: sx + (side || 0), clientY: sy + back, preventDefault: noop });
  step(1);
  window.__fire('mouseup', { clientX: sx + (side || 0), clientY: sy + back, preventDefault: noop });
  for (let i = 0; i < 600 && S.shoe; i++) step(1);
  return S.landedShoes[S.landedShoes.length - 1];
}

console.log('\n[5] Scoring tiers (regression — tuning preserved)');
ok('weak throw misses short', thr(80).score === 0);
ok('RINGER reachable (3)', [142, 144, 145, 147].some(b => thr(b).score === 3));
ok('LEANER reachable (2)', [139, 150, 151].some(b => thr(b).score === 2));
ok('CLOSE reachable (1)', [134, 154].some(b => thr(b).score === 1));
ok('overshoot misses long', thr(175).score === 0);
ok('lateral aim is symmetric', thr(145, 40).score === thr(145, -40).score);

console.log('\n[6] BUGFIX: sideways-only drag no longer throws at full power');
const straight = thr(200, 0);
const sideways = thr(0, 200);   // pure horizontal drag, no pull-back
ok('sideways drag travels much shorter than a full pull-back',
  sideways.d < straight.d * 0.5, `sideways d=${sideways.d.toFixed(3)} straight d=${straight.d.toFixed(3)}`);
ok('sideways drag still goes sideways', Math.abs(sideways.x) > 0.01);

console.log('\n[7] Wind');
const calm = thr(145, 0, 0);
const windy = thr(145, 0, C.windMax);
ok('wind pushes the shoe sideways', windy.x > calm.x + 0.01,
  `calm x=${calm.x.toFixed(4)} windy x=${windy.x.toFixed(4)}`);
ok('wind is bounded (still playable)', Math.abs(windy.x - calm.x) < C.closeRadius * 1.5);
// preview must account for wind
reset(C.windMax);
const sx = VW / 2, sy = VH * 0.7;
canvas.__fire('mousedown', { clientX: sx, clientY: sy, preventDefault: noop });
window.__fire('mousemove', { clientX: sx, clientY: sy + 145, preventDefault: noop });
step(1);
const wPrev = S.preview && S.preview.land.x;
window.__fire('mouseup', { clientX: sx, clientY: sy + 145, preventDefault: noop });
for (let i = 0; i < 600 && S.shoe; i++) step(1);
ok('preview accounts for wind', Math.abs(wPrev - S.landedShoes[S.landedShoes.length - 1].x) < 1e-9);

console.log('\n[8] BUGFIX: puff physics runs in update(), not render()');
reset(0); thr(145);
const p0 = S.puffs[0];
ok('landing spawns dust puffs', !!p0);
if (p0) {
  const before = p0.x, beforeT = p0.t;
  // Render-only passes must NOT move puffs (physics belongs in update()).
  global.__render(); global.__render(); global.__render();
  ok('puff position stable across 3 renders',
    S.puffs[0].x === before && S.puffs[0].t === beforeT,
    `x ${before} -> ${S.puffs[0].x}, t ${beforeT} -> ${S.puffs[0].t}`);
  step(1);
  ok('puff advances on update', S.puffs[0].t > beforeT);
}

console.log('\n[9] Round flow');
S.screen = 'game'; S.roundScore = 0; S.landedShoes = []; S.shoe = null;
S.throwsLeft = C.throwsPerRound; S.totalScore = 0; S.bestScore = 0; S.wind = 0;
function realThrow(back) {
  const sx = VW / 2, sy = VH * 0.7;
  canvas.__fire('mousedown', { clientX: sx, clientY: sy, preventDefault: noop });
  window.__fire('mousemove', { clientX: sx, clientY: sy + back, preventDefault: noop });
  step(1);
  window.__fire('mouseup', { clientX: sx, clientY: sy + back, preventDefault: noop });
  for (let i = 0; i < 600 && S.shoe; i++) step(1);
}
realThrow(145); const afterOne = S.throwsLeft; realThrow(145);
ok('throws decrement', afterOne === 1 && S.throwsLeft === 0);
ok('round score accumulates', S.roundScore >= 4);
while (pend.length) pend.shift()();
ok('round end -> results', S.screen === 'results');
ok('total updated', S.totalScore === S.roundScore);
ok('best tracked', S.bestScore === S.roundScore);
drawn.length = 0; step(1);
ok('results overlay rendered', drawn.some(t => /Round Over/.test(t)) && !!btn('THROW AGAIN'));

console.log('\n[10] Throw Again restarts');
const prevRound = S.round;
tap(btn('THROW AGAIN')); step(1);
ok('fresh round', S.screen === 'game' && S.throwsLeft === C.throwsPerRound && S.roundScore === 0);
ok('round counter advanced', S.round === prevRound + 1);

console.log('\n[11] Mute toggle');
step(1);
const mute = btn('mute');
ok('mute button registered in HUD', !!mute);
if (mute) {
  const was = S.muted; tap(mute); step(1);
  ok('tapping mute toggles sound', S.muted === !was);
  tap(btn('mute')); step(1);
  ok('tapping again restores', S.muted === was);
}
ok('buttons do not accumulate across frames', S.buttons.length <= 3, 'len=' + S.buttons.length);

console.log('\n[12] Responsive layout');
const dragPortrait = V.aimMaxDrag;
VW = 820; VH = 390; global.window.innerWidth = VW; global.window.innerHeight = VH;
let lErr = null;
try { global.window.__fire('resize', {}); step(2); } catch (e) { lErr = e; }
ok('landscape resize renders without error', !lErr, lErr && lErr.message);
ok('stake stays on screen in landscape',
  V.stakeScreen.x > 0 && V.stakeScreen.x < VW && V.stakeScreen.y > 0 && V.stakeScreen.y < VH,
  JSON.stringify(V.stakeScreen));
ok('pit not wider than the screen', V.nearHalfW * 2 <= VW);
VW = 820; VH = 1180; global.window.innerWidth = VW; global.window.innerHeight = VH;
global.window.__fire('resize', {}); step(1);
ok('drag length scales up on a larger screen', V.aimMaxDrag > dragPortrait,
  `${dragPortrait} -> ${V.aimMaxDrag}`);

console.log('\nRESULT: %d passed, %d failed', pass, fail);
process.exit(fail ? 1 : 0);
