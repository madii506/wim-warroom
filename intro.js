// The way in: a battlefield at night, a bunker's blast doors, the war room, the PC standing at the end of it, then the
// camera is thrown into its screen and the site is what's inside. About 10 s, no words. A click, a tap or Esc skips it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LAND } from './map.js?v=1';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const R = (a, b) => a + rnd() * (b - a);
function cv(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tx(c, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
const glowT = tx(cv(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,220,160,.8)'); r.addColorStop(.6, 'rgba(255,120,40,.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }));
const smokeT = tx(cv(128, 128, (g) => { for (let i = 0; i < 26; i++) { const x = R(34, 94), y = R(34, 94), rr = R(14, 34), r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, 'rgba(255,255,255,.22)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); } }));
const noise = (base, n, a) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = rnd() < .5 ? `rgba(255,255,255,${rnd() * a})` : `rgba(0,0,0,${rnd() * a * 1.6})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } };

export function wantIntro() { return document.documentElement.classList.contains('intro-on'); }

export async function playIntro(el) {
  try { sessionStorage.setItem('wim:intro', '1'); } catch {}
  await document.fonts.load('20px Silkscreen').catch(() => {});
  const canvas = el.querySelector('canvas'), flash = el.querySelector('.flash');
  const small = innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0605); scene.fog = new THREE.FogExp2(0x1c0d09, .016);
  const cam = new THREE.PerspectiveCamera(innerWidth / innerHeight < 1 ? 68 : 50, innerWidth / innerHeight, .05, 900);
  const lam = o => new THREE.MeshLambertMaterial(o), std = o => new THREE.MeshStandardMaterial(o);
  const add = (geo, mat, x = 0, y = 0, z = 0, p = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); return m; };
  const additive = (o = {}) => ({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, ...o });

  // ---------------------------------------------------------------- outside: sky, ground, ruins, sandbags
  const sky = tx(cv(16, 512, (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#040307'); s.addColorStop(.42, '#0d0609'); s.addColorStop(.5, '#3a1006'); s.addColorStop(.53, '#5a1a07'); s.addColorStop(.56, '#1a0806'); s.addColorStop(1, '#050304'); g.fillStyle = s; g.fillRect(0, 0, w, h); }));
  add(new THREE.SphereGeometry(500, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, toneMapped: false }));
  const ground = tx(cv(512, 512, noise('#151110', 9000, .12)), [40, 40]);
  add(new THREE.PlaneGeometry(700, 700), lam({ map: ground, color: 0x6b5a50 }), 0, 0, 0).rotation.x = -Math.PI / 2;
  const winT = tx(cv(64, 128, (g, w, h) => { g.fillStyle = '#0a0908'; g.fillRect(0, 0, w, h); for (let y = 6; y < h - 6; y += 12) for (let x = 5; x < w - 5; x += 11) if (rnd() < .16) { g.fillStyle = rnd() < .7 ? 'rgba(255,120,40,.9)' : 'rgba(255,200,120,.8)'; g.fillRect(x, y, 6, 7); } }));
  const ruinM = lam({ color: 0x0c0a0a }), ruinW = lam({ color: 0x241c18, emissive: 0xffffff, emissiveMap: winT, emissiveIntensity: .9 });
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1, far = i > 40, x = far ? R(-140, 140) : side * R(9, 80), z = far ? R(-60, -220) : R(14, 120), h = far ? R(8, 34) : R(3, 16), w = R(3, 9), d = R(3, 9);
    const m = add(new THREE.BoxGeometry(w, h, d), rnd() < .45 ? ruinW : ruinM, x, h / 2 - .2, z); m.rotation.y = R(-.4, .4); m.rotation.z = R(-.05, .05);
    if (rnd() < .5) { const c = add(new THREE.BoxGeometry(w * .6, h * .3, d * .9), ruinM, x + R(-1, 1), h + h * .1, z); c.rotation.z = R(-.6, .6); }
  }
  const fires = [[-9, 30, 1.3], [11, 21, 1.1], [-21, 12, 1.6], [25, 41, 1.8], [-6, 60, 1.4], [16, 9, .9], [-34, 46, 2], [40, 70, 2.2], [-15, -28, 2.4], [20, -36, 2.6]].map(([x, z, s]) => {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xff7a2a, ...additive() })); f.position.set(x, s * .55, z); f.scale.set(s * 2.4, s * 2.8, 1); scene.add(f);
    const L = new THREE.PointLight(0xff6a24, 0, 34, 1.3); L.position.set(x, s * 1.4, z); scene.add(L);
    const sm = Array.from({ length: 4 }, (_, k) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, color: 0x4a3a34, transparent: true, depthWrite: false, opacity: .45 })); m.position.set(x, s + k * 2.2, z); m.scale.setScalar(s * (2.5 + k)); m.userData.k = k; scene.add(m); return m; });
    return { f, L, sm, s, x, z, ph: R(0, 6) };
  });
  const sand = lam({ color: 0x5d5340 });
  for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) { const b = add(new RoundedBoxGeometry(.9, .32, .55, 3, .14), sand, sx * (2.6 + k * .85 + r * .42), .16 + r * .3, 7.2 + R(-.1, .1)); b.rotation.y = R(-.15, .15); }

  // the bunker: a concrete face, hazard frame, blast doors, a red lamp
  const concrete = tx(cv(512, 512, noise('#2a2826', 14000, .14)), [3, 1.2]);
  const conM = lam({ map: concrete, color: 0x8a8580 });
  add(new THREE.BoxGeometry(8, 7, 1.4), conM, -5.6, 3.5, 5.8); add(new THREE.BoxGeometry(8, 7, 1.4), conM, 5.6, 3.5, 5.8); add(new THREE.BoxGeometry(3.2, 3.6, 1.4), conM, 0, 5.2, 5.8);
  add(new THREE.BoxGeometry(20, 1.2, 9), conM, 0, 7.6, 1.5);
  const hz = tx(cv(256, 32, (g, w, h) => { g.fillStyle = '#d8b01e'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; for (let x = -32; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); } }), [1, 1]);
  const hzM = lam({ map: hz });
  add(new THREE.BoxGeometry(3.6, .22, .2), hzM, 0, 3.52, 6.55); add(new THREE.BoxGeometry(.22, 3.5, .2), hzM, -1.72, 1.75, 6.55).material = lam({ map: hz }); add(new THREE.BoxGeometry(.22, 3.5, .2), hzM, 1.72, 1.75, 6.55);
  const steel = std({ color: 0x3a3d3c, roughness: .55, metalness: .6 });
  const doorL = add(new THREE.BoxGeometry(1.62, 3.42, .3), steel, -.8, 1.71, 6.15), doorR = add(new THREE.BoxGeometry(1.62, 3.42, .3), steel, .8, 1.71, 6.15);
  for (const d of [doorL, doorR]) for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(1.5, .06, .05), lam({ color: 0x1b1d1c }), 0, -1.2 + i * .8, .17, d);
  const lampM = new THREE.MeshBasicMaterial({ color: 0xff2a14, toneMapped: false });
  add(new THREE.SphereGeometry(.16, 16, 10), lampM, 0, 3.95, 6.6);
  const doorLamp = new THREE.PointLight(0xff2a14, 0, 12, 1.6); doorLamp.position.set(0, 3.9, 7.2); scene.add(doorLamp);

  // ---------------------------------------------------------------- the war room
  const grid = tx(cv(256, 256, (g, w, h) => { g.fillStyle = '#0b100d'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(60,200,130,.22)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); g.strokeStyle = 'rgba(60,200,130,.08)'; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); }), [8, 13]);
  add(new THREE.PlaneGeometry(14.6, 26), std({ map: grid, roughness: .45, metalness: .35 }), 0, .01, -8).rotation.x = -Math.PI / 2;
  const wallM = lam({ map: tx(cv(512, 512, noise('#1b1c1b', 12000, .1)), [4, 1]), color: 0x6f716e });
  add(new THREE.PlaneGeometry(26, 4.4), wallM, -7.2, 2.2, -8).rotation.y = Math.PI / 2;
  add(new THREE.PlaneGeometry(26, 4.4), wallM, 7.2, 2.2, -8).rotation.y = -Math.PI / 2;
  add(new THREE.PlaneGeometry(14.6, 4.4), wallM, 0, 2.2, -21);
  add(new THREE.PlaneGeometry(14.6, 26), lam({ color: 0x0b0b0b }), 0, 4.4, -8).rotation.x = Math.PI / 2;
  const strips = [];
  for (let z = 2; z > -20; z -= 4) { const s = add(new THREE.BoxGeometry(5, .05, .14), new THREE.MeshBasicMaterial({ color: 0x9fe8c4, toneMapped: false }), 0, 4.35, z); strips.push(s); }
  // the wall map
  const board = cv(2400, 1000, (x, W, H) => {
    x.fillStyle = '#020a06'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(40,140,90,.25)'; x.lineWidth = 2;
    for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(i * W / 12, 0); x.lineTo(i * W / 12, H); x.stroke(); }
    for (let j = 0; j <= 5; j++) { x.beginPath(); x.moveTo(0, j * H / 5); x.lineTo(W, j * H / 5); x.stroke(); }
    const cw = W / 200, ch = H / 82;
    LAND.forEach((row, j) => { for (let i = 0; i < 200; i++) if (row[i] === 'X') { x.fillStyle = (i * 7 + j * 3) % 5 ? 'rgba(80,240,160,.85)' : 'rgba(80,240,160,.45)'; x.beginPath(); x.arc((i + .5) * cw, (j + .5) * ch, cw * .3, 0, 7); x.fill(); } });
    for (const [la, lo] of [[32.4, 53.7], [49, 32], [23.7, 121], [31.4, 34.9], [56, 40], [15.5, 47.5]]) {
      const px = (lo + 180) / 360 * W, py = (78 - la) / 140 * H;
      x.shadowColor = '#ff3b2e'; x.shadowBlur = 30; x.fillStyle = '#ff4a38'; x.beginPath(); x.arc(px, py, 10, 0, 7); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = 'rgba(255,70,50,.8)'; x.lineWidth = 3; for (const r of [24, 44, 66]) { x.globalAlpha = 1 - r / 84; x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke(); } x.globalAlpha = 1;
    }
  });
  const boardTex = tx(board);
  add(new THREE.PlaneGeometry(12.4, 5.17), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false, color: new THREE.Color(.85, .85, .85) }), 0, 2.25, -20.95);
  // consoles down both walls, each with two glowing monitors facing the aisle
  const scrT = [0, 1, 2].map(k => tx(cv(128, 96, (g, w, h) => { g.fillStyle = '#031409'; g.fillRect(0, 0, w, h); g.fillStyle = k === 2 ? '#ff4a38' : '#57f0a0'; for (let y = 10; y < h - 8; y += 9) g.fillRect(8, y, R(20, w - 16), 4); if (k === 1) { g.strokeStyle = '#57f0a0'; g.lineWidth = 2; g.beginPath(); for (let x = 8; x < w - 8; x += 6) g.lineTo(x, 60 + Math.sin(x / 9) * 14 + R(-6, 6)); g.stroke(); } })));
  const deskM = lam({ color: 0x2b2e2c }), monM = lam({ color: 0xbcae88 });
  const monScreens = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
    const z = -1 - k * 4.2, G = new THREE.Group(); G.position.set(sx * 5.9, 0, z); G.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(G);
    add(new THREE.BoxGeometry(2.6, .82, 1), deskM, 0, .41, 0, G);
    for (const mx of [-.6, .6]) {
      add(new THREE.BoxGeometry(.66, .54, .5), monM, mx, 1.12, -.12, G);
      const s = add(new THREE.PlaneGeometry(.52, .4), new THREE.MeshBasicMaterial({ map: scrT[(k + (mx > 0 ? 1 : 0) + (sx > 0 ? 1 : 0)) % 3], toneMapped: false }), mx, 1.13, .135, G); monScreens.push(s);
    }
  }
  // the beacon on the ceiling: two red beams sweeping the room
  const beacon = new THREE.Group(); beacon.position.set(0, 4.15, -7); scene.add(beacon);
  add(new THREE.CylinderGeometry(.16, .2, .24, 20), new THREE.MeshBasicMaterial({ color: 0xff2414, toneMapped: false }), 0, 0, 0, beacon);
  const beams = [0, Math.PI].map(a => { const s = new THREE.SpotLight(0xff2a18, 0, 28, .42, .6, 1.2); s.position.set(0, 0, 0); beacon.add(s); const t = new THREE.Object3D(); t.position.set(Math.cos(a) * 6, -2.6, Math.sin(a) * 6); beacon.add(t); s.target = t; return s; });
  const roomGlow = new THREE.PointLight(0x3cff9a, 0, 16, 1.4); roomGlow.position.set(0, 2.4, -17); scene.add(roomGlow);
  const roomFill = new THREE.PointLight(0x9fe0ff, 0, 22, 1.3); roomFill.position.set(0, 3.6, -3); scene.add(roomFill);
  const consoleL = [-1, 1].flatMap(sx => [-3, -11].map(z => { const l = new THREE.PointLight(0x46ff9e, 0, 9, 1.4); l.position.set(sx * 4.6, 1.8, z); scene.add(l); return l; }));

  // the PC, standing on a plinth at the end of the aisle
  const P = new THREE.Group(); P.position.set(0, .95, -12.5); scene.add(P);
  add(new THREE.BoxGeometry(1.4, .95, 1.1), std({ color: 0x1a1c1b, roughness: .5, metalness: .5 }), 0, -.475, -.1, P);
  const plastic = std({ color: 0xd3c39c, roughness: .5 }), plastic2 = std({ color: 0xbfae84, roughness: .58 }), black = std({ color: 0x0b0b0c, roughness: .5 });
  add(new RoundedBoxGeometry(.98, .2, .78, 4, .02), plastic, 0, .1, -.12, P);
  for (const [w, h, x, y] of [[.3, .016, .2, .12], [.3, .016, .2, .07], [.12, .03, -.3, .1]]) add(new THREE.BoxGeometry(w, h, .01), black, x, y, .272, P);
  const mon = new THREE.Group(); mon.position.set(0, .26, -.05); P.add(mon);
  add(new THREE.CylinderGeometry(.16, .2, .05, 32), plastic2, 0, -.035, -.05, mon);
  add(new RoundedBoxGeometry(.8, .64, .1, 5, .03), plastic, 0, .32, .06, mon);
  const back = new THREE.BoxGeometry(.74, .58, .5), bp = back.attributes.position;
  for (let i = 0; i < bp.count; i++) if (bp.getZ(i) < 0) { bp.setX(i, bp.getX(i) * .66); bp.setY(i, bp.getY(i) * .7 + .02); }
  back.computeVertexNormals(); add(back, plastic2, 0, .32, -.2, mon);
  add(new THREE.BoxGeometry(.64, .49, .02), std({ color: 0x141614, roughness: .4 }), 0, .335, .105, mon);
  const kb = new THREE.Group(); kb.position.set(0, .018, .43); kb.rotation.x = .05; P.add(kb);
  add(new RoundedBoxGeometry(.86, .03, .27, 3, .01), plastic, 0, 0, 0, kb);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(.034, .014, .034), plastic2, 120); let n = 0; const M4 = new THREE.Matrix4();
  for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) { if (r === 5 && c > 3 && c < 12) continue; M4.makeTranslation(-.38 + c * .04, .021, -.1 + r * .042); keys.setMatrixAt(n++, M4); }
  keys.count = n; kb.add(keys);
  // its screen: off, a flicker, then WIM
  const S = document.createElement('canvas'); S.width = 1024; S.height = 768; const sx = S.getContext('2d');
  const GL = { W: ['XX.....XX', 'XX.....XX', 'XX.....XX', 'XX..X..XX', 'XX.XXX.XX', 'XXXXXXXXX', 'XXXX.XXXX', 'XXX...XXX', 'XX.....XX'], I: ['XXXXXX', 'XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX', 'XXXXXX'], M: ['XX.....XX', 'XXX...XXX', 'XXXX.XXXX', 'XXXXXXXXX', 'XX.XXX.XX', 'XX..X..XX', 'XX.....XX', 'XX.....XX', 'XX.....XX'] };
  function paint(stage) {
    const x = sx, W = 1024, H = 768;
    const r = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 720); r.addColorStop(0, stage ? '#0b2b20' : '#030806'); r.addColorStop(1, '#010604'); x.fillStyle = r; x.fillRect(0, 0, W, H);
    if (stage >= 1) {
      const px = 26, cols = 9 + 6 + 9 + 4; let x0 = (W - cols * px) / 2; const y0 = 190;
      x.shadowColor = '#86ffbe'; x.shadowBlur = 30; x.fillStyle = '#86ffbe';
      for (const ch of 'WIM') { GL[ch].forEach((row, ry) => [...row].forEach((c, rx) => { if (c === 'X') x.fillRect(x0 + rx * px, y0 + ry * px, px - 3, px - 3); })); x0 += (GL[ch][0].length + 2) * px; }
      if (stage >= 2) { x.shadowBlur = 14; x.font = '44px Silkscreen'; x.textAlign = 'center'; x.fillText('WAR IS MONEY', W / 2 - 10, 520); x.fillRect(W / 2 + 190, 486, 26, 38); x.textAlign = 'left'; }
      x.shadowBlur = 0; x.font = '26px Silkscreen'; x.fillStyle = 'rgba(134,255,190,.55)'; x.fillText('C:\\WIM>', 60, 70); x.fillStyle = '#ff4a38'; x.fillText('LIVE', W - 140, 70); x.fillRect(W - 168, 50, 16, 16);
    }
    x.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 2);
    const v = x.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 760); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    scrTex.needsUpdate = true;
  }
  const scrTex = tx(S);
  const sg = new THREE.PlaneGeometry(.6, .45, 24, 18), spp = sg.attributes.position;
  for (let i = 0; i < spp.count; i++) { const a = spp.getX(i) / .3, b = spp.getY(i) / .225; spp.setZ(i, .016 * (1 - .5 * (a * a + b * b))); }
  sg.computeVertexNormals();
  add(sg, new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }), 0, .335, .118, mon);
  paint(0);
  const pcKey = new THREE.SpotLight(0xffcf9a, 0, 14, .38, .7, 1.3); pcKey.position.set(-1.6, 4.2, -10); pcKey.target = P; scene.add(pcKey);
  const pcGlow = new THREE.PointLight(0x4dffa0, 0, 3, 1.6); pcGlow.position.set(0, 1.7, -11.6); scene.add(pcGlow);
  scene.add(new THREE.HemisphereLight(0x6a4034, 0x120808, .85));
  const moon = new THREE.DirectionalLight(0x8fa0d8, .5); moon.position.set(-20, 30, 40); scene.add(moon);
  const fireSky = new THREE.DirectionalLight(0xff6a30, .7); fireSky.position.set(12, 6, 60); scene.add(fireSky);

  // ---------------------------------------------------------------- the war: fire, smoke, sparks, tracers, searchlights, embers
  const flashes = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff8a3a, 0, 120, 1.1); scene.add(l); return l; });
  const booms = []; let fl = 0, shake = 0;
  function boom(x, y, z, s, sh = 0) {
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffb060, ...additive() })); fire.position.set(x, y + s * .3, z); scene.add(fire);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffffff, ...additive() })); core.position.copy(fire.position); scene.add(core);
    const smoke = Array.from({ length: 6 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, color: 0x6a4a3e, transparent: true, depthWrite: false, opacity: 0 })); m.position.set(x + R(-s, s) * .5, y + R(0, s * .6), z + R(-s, s) * .5); m.material.rotation = R(0, 6); scene.add(m); return m; });
    const N = 70, pos = new Float32Array(N * 3), vel = [];
    for (let i = 0; i < N; i++) { pos.set([x, y + s * .3, z], i * 3); const a = R(0, 6.283), e = R(.2, 1.4), sp = R(4, 14) * s / 4; vel.push([Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp * 1.2, Math.sin(a) * Math.cos(e) * sp]); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffc070, size: .18 * Math.max(1, s / 4), map: glowT, ...additive() })); scene.add(sparks);
    const L = flashes[fl++ % 3]; L.position.set(x, y + 2, z);
    booms.push({ t0: T, s, fire, core, smoke, sparks, vel, L });
    shake = Math.max(shake, sh);
  }
  const tracerM = new THREE.MeshBasicMaterial({ color: 0xffd27a, ...additive() });
  const tracers = Array.from({ length: 16 }, () => { const m = add(new THREE.CylinderGeometry(.16, .16, 7, 6), tracerM, 0, -50, 0); m.userData = { t: -R(0, 3), v: V(0, 0, 0) }; return m; });
  const spawnTracer = m => { const x0 = R(-70, 70), z0 = R(-25, -110), el = R(.7, 1.25), az = R(-.6, .6) + (x0 > 0 ? -.4 : .4), sp = R(70, 110); m.position.set(x0, 0, z0); m.userData.v.set(Math.sin(az) * Math.cos(el) * sp, Math.sin(el) * sp, Math.cos(az) * Math.cos(el) * sp * .2); m.userData.t = 0; m.quaternion.setFromUnitVectors(V(0, 1, 0), m.userData.v.clone().normalize()); };
  const cone = tx(cv(4, 256, (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(.6, 'rgba(255,255,255,.35)'); s.addColorStop(1, 'rgba(255,255,255,.9)'); g.fillStyle = s; g.fillRect(0, 0, w, h); }));
  const lights = [];
  const NE = small ? 220 : 480, epos = new Float32Array(NE * 3), evel = new Float32Array(NE);
  for (let i = 0; i < NE; i++) { epos.set([R(-45, 45), R(0, 22), R(-30, 70)], i * 3); evel[i] = R(.5, 1.8); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(epos, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xff8a40, size: .28, map: glowT, ...additive({ fog: true }) })); scene.add(embers);

  // ---------------------------------------------------------------- the camera's way in
  const keysT = [0, 2.5, 4.5, 5.4, 6.7, 8.3, 9.25], pos = [V(0, 2.5, 44), V(1.4, 2.1, 25), V(.2, 1.8, 11.5), V(0, 1.65, 5.6), V(0, 1.6, -1.5), V(0, 1.52, -8.4), V(0, 1.53, -10.35)];
  const look = [V(0, 3.2, 0), V(0, 2.4, 0), V(0, 1.75, 0), V(0, 1.6, -6), V(0, 1.55, -12), V(0, 1.5, -12.4), V(0, 1.545, -12.43)];
  const pc = new THREE.CatmullRomCurve3(pos), lc = new THREE.CatmullRomCurve3(look);
  const at = t => { let i = 0; while (i < keysT.length - 2 && t > keysT[i + 1]) i++; const k = clamp((t - keysT[i]) / (keysT[i + 1] - keysT[i])); return (i + k) / (keysT.length - 1); };
  const plan = [[.25, -30, 3, -40, 7], [.7, 26, 2, -20, 6], [1.15, 17, .5, 27, 3.6, .5], [1.6, -44, 5, -80, 9], [1.9, 10, 7, -95, 10], [2.35, 38, 2, 30, 5], [2.7, -15, .5, 19, 3.4, .6], [3.1, -2, 10, -120, 12], [3.35, 34, 3, -48, 7], [3.8, -26, 1, 4, 5], [4.05, -8, 9, -130, 11], [4.75, 13, .4, 9.5, 2.8, .35]];
  let pi = 0;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .85, .55, .72));
  composer.addPass(new OutputPass());
  const fit = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener('resize', fit);

  const DEBUG = new URLSearchParams(location.search).get('introt');
  let T = 0, last = 0, t0 = 0, done = false, raf = 0, stage = 0, flick = 0;
  const fov0 = cam.fov, tmp = V(0, 0, 0);
  return new Promise(resolve => {
    const finish = () => {
      if (done) return; done = true;
      el.classList.add('out'); resolve();
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', fit); renderer.dispose(); el.remove(); }, 900);
    };
    if (!DEBUG) { el.addEventListener('pointerdown', finish); addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(); }); }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!t0) { t0 = now; last = now; el.classList.add('on'); }
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      T = DEBUG ? +DEBUG : (now - t0) / 1000;
      if (DEBUG && pi === 0) { for (const p of plan) if (p[0] < T) { boom(p[1], p[2], p[3], p[4], 0); booms[booms.length - 1].t0 = p[0]; } pi = plan.length; }
      while (pi < plan.length && T >= plan[pi][0]) { const p = plan[pi++]; boom(p[1], p[2], p[3], p[4], p[5] || 0); }
      // the battle
      for (let i = booms.length - 1; i >= 0; i--) {
        const b = booms[i], a = T - b.t0, s = b.s;
        b.fire.scale.setScalar(s * 1.5 * (1 + Math.min(1, a * 5) * 2.4)); b.fire.material.opacity = clamp(1 - a / .9);
        b.core.scale.setScalar(s * 1.4 * (1 + a * 3)); b.core.material.opacity = clamp(1 - a / .25);
        b.smoke.forEach((m, k) => { m.scale.setScalar(s * (1.2 + a * .9 + k * .15)); m.material.opacity = clamp(a * 4) * .7 * clamp(1 - a / 6); m.position.y += dt * (.6 + k * .1) * s / 4; });
        const ps = b.sparks.geometry.attributes.position;
        for (let k = 0; k < b.vel.length; k++) { const v = b.vel[k]; v[1] -= 9.8 * dt * .5; ps.array[k * 3] += v[0] * dt; ps.array[k * 3 + 1] = Math.max(0, ps.array[k * 3 + 1] + v[1] * dt); ps.array[k * 3 + 2] += v[2] * dt; }
        ps.needsUpdate = true; b.sparks.material.opacity = clamp(1 - a / 1.6);
        b.L.intensity = s * 520 * Math.exp(-a * 4);
        if (a > 6.5) { [b.fire, b.core, b.sparks, ...b.smoke].forEach(m => { scene.remove(m); m.material.dispose(); }); b.sparks.geometry.dispose(); booms.splice(i, 1); }
      }
      for (const F of fires) { const k = .75 + .25 * Math.sin(T * 13 + F.ph) * Math.sin(T * 7.3 + F.ph * 2); F.L.intensity = 26 * F.s * k; F.f.material.opacity = .65 + .35 * k; F.f.scale.set(F.s * 2.4 * (0.9 + .15 * k), F.s * 2.8 * (0.9 + .2 * k), 1);
        F.sm.forEach(m => { m.position.y += dt * (1 + m.userData.k * .3); m.position.x += dt * .6; if (m.position.y > F.s + 9) { m.position.set(F.x, F.s, F.z); } m.material.opacity = .45 * (1 - (m.position.y - F.s) / 9); }); }
      for (const m of tracers) { const u = m.userData; u.t += dt; if (u.t > 1.6) spawnTracer(m); else if (u.t > 0) m.position.addScaledVector(u.v, dt); }
      lights.forEach((m, k) => { m.rotation.z = Math.sin(T * .35 + k * 2) * .45 * m.userData.sd; m.rotation.x = -.15 + Math.sin(T * .27 + k) * .12; });
      const ep = embers.geometry.attributes.position;
      for (let i = 0; i < NE; i++) { ep.array[i * 3 + 1] += evel[i] * dt; ep.array[i * 3] += Math.sin(T + i) * dt * .6; if (ep.array[i * 3 + 1] > 22) ep.array[i * 3 + 1] = 0; }
      ep.needsUpdate = true;
      // the doors, the lamp, the room waking up
      const open = ease(clamp((T - 3.3) / 1.5)); doorL.position.x = -.8 - open * 1.65; doorR.position.x = .8 + open * 1.65;
      doorLamp.intensity = (Math.sin(T * 9) > 0 ? 6 : .5); lampM.color.setRGB(Math.sin(T * 9) > 0 ? 1 : .25, .1, .05);
      const inside = clamp((T - 3.4) / 2.2);
      roomGlow.intensity = 11 * inside; roomFill.intensity = 4.5 * inside; consoleL.forEach(l => { l.intensity = 3.2 * inside; });
      beacon.rotation.y = T * 2.6; beams.forEach(b => { b.intensity = 26 * inside; });
      pcKey.intensity = 9 * clamp((T - 6) / 1.5);
      if (T > 6.3 && T < 6.9) { flick = Math.random() < .5 ? .15 : 1; shake = Math.max(shake, .12); } else flick = 1;
      strips.forEach(s => s.material.color.setScalar(.62 * flick * inside));
      monScreens.forEach((s, k) => { s.material.color.setScalar(inside * (Math.sin(T * 7 + k * 1.7) > .97 ? .4 : 1)); });
      const want = T < 7.2 ? 0 : T < 7.9 ? (Math.random() < .5 ? 0 : 1) : T < 8.6 ? 1 : 2;
      if (want !== stage) { stage = want; paint(stage); }
      pcGlow.intensity = stage ? 1.6 : 0;
      // the camera
      const u = at(Math.min(T, 9.25));
      pc.getPoint(u, cam.position); lc.getPoint(u, tmp);
      if (T > 9.25) {                                  // thrown into the screen
        const k = clamp((T - 9.25) / .78), e = k * k * k;
        cam.position.lerpVectors(pos[pos.length - 1], V(0, 1.545, -12.3), e); tmp.set(0, 1.545, -12.43);
        cam.fov = fov0 + 16 * e; cam.updateProjectionMatrix();
        flash.style.opacity = clamp((T - 9.9) / .2).toFixed(3);
        if (T > 10.2) finish();
      }
      shake *= Math.exp(-dt * 4);
      if (shake > .002) { cam.position.x += (Math.random() - .5) * shake; cam.position.y += (Math.random() - .5) * shake; }
      cam.lookAt(tmp);
      composer.render();
    }
    raf = requestAnimationFrame(frame);
  });
}
