// The hero: WIM's beige PC alone in the dark, its CRT showing the live board. Drag or move the mouse to look around.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function mountPC(canvas, screenCanvas) {
  const small = innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x030605, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .2;

  const std = o => new THREE.MeshStandardMaterial(o);
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const plastic = std({ color: 0xd3c39c, roughness: .5 }), plastic2 = std({ color: 0xbfae84, roughness: .58 }), dark = std({ color: 0x2a2a26, roughness: .7 }), black = std({ color: 0x0b0b0c, roughness: .5 });
  const led = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

  const pc = new THREE.Group(); scene.add(pc);
  mesh(new RoundedBoxGeometry(.98, .2, .78, 4, .02), plastic, 0, .1, -.12, pc);
  const front = (w, h, x, y, m = black) => mesh(new THREE.BoxGeometry(w, h, .01), m, x, y, .272, pc);
  front(.3, .016, .2, .12); front(.3, .016, .2, .07); front(.12, .03, -.3, .1, dark);
  mesh(new THREE.BoxGeometry(.014, .014, .01), led(0x3cff7a), -.42, .06, .274, pc);
  const hdd = mesh(new THREE.BoxGeometry(.014, .014, .01), led(0xff3a22), -.39, .06, .274, pc);
  for (let i = 0; i < 7; i++) front(.004, .1, -.15 + i * .018, .1, dark);
  const mon = new THREE.Group(); mon.position.set(0, .26, -.05); pc.add(mon);
  mesh(new THREE.CylinderGeometry(.16, .2, .05, 32), plastic2, 0, -.035, -.05, mon);
  mesh(new RoundedBoxGeometry(.8, .64, .1, 5, .03), plastic, 0, .32, .06, mon);
  const back = new THREE.BoxGeometry(.74, .58, .5); const p = back.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getZ(i) < 0) { p.setX(i, p.getX(i) * .66); p.setY(i, p.getY(i) * .7 + .02); }
  back.computeVertexNormals(); mesh(back, plastic2, 0, .32, -.2, mon);
  mesh(new THREE.BoxGeometry(.64, .49, .02), std({ color: 0x141614, roughness: .4 }), 0, .335, .105, mon);
  mesh(new THREE.BoxGeometry(.012, .012, .01), led(0x3cff7a), .23, .045, .116, mon);
  const sg = new THREE.PlaneGeometry(.6, .45, 24, 18); const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) / .3, y = sp.getY(i) / .225; sp.setZ(i, .016 * (1 - .5 * (x * x + y * y))); }
  sg.computeVertexNormals();
  const tex = new THREE.CanvasTexture(screenCanvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const screen = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(.92, .92, .92) })); screen.position.set(0, .335, .118); mon.add(screen);

  // dog tags over the bezel
  const steel = std({ color: 0xd8dbdd, metalness: .7, roughness: .25, envMapIntensity: 3 });
  const chain = new THREE.CatmullRomCurve3([V(.355, .64, .04), V(.355, .655, .1), V(.352, .62, .121), V(.35, .53, .124), V(.346, .47, .125)]);
  const bead = new THREE.SphereGeometry(.0032, 8, 6); for (let i = 0; i <= 60; i++) mesh(bead, steel, ...chain.getPointAt(i / 60).toArray(), mon);
  const tagM = std({ color: 0xe6e9eb, metalness: .6, roughness: .26, envMapIntensity: 3 });
  const tags = new THREE.Group(); tags.position.set(.35, .47, .128); mon.add(tags);
  [[-.004, -.038, .003, .1], [.008, -.048, -.001, -.14]].forEach(([x, y, z, r]) => { const t = mesh(new RoundedBoxGeometry(.05, .086, .004, 3, .012), tagM, x, y, z, tags); t.rotation.z = r; });

  const kb = new THREE.Group(); kb.position.set(0, .018, .43); kb.rotation.x = .05; scene.add(kb);
  mesh(new RoundedBoxGeometry(.86, .03, .27, 3, .01), plastic, 0, 0, 0, kb);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(.034, .014, .034), plastic2, 120); let n = 0; const M = new THREE.Matrix4();
  for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) { if (r === 5 && c > 3 && c < 12) continue; M.makeTranslation(-.38 + c * .04, .021, -.1 + r * .042); keys.setMatrixAt(n++, M); }
  M.makeScale(8, 1, 1).setPosition(-.06, .021, .11); keys.setMatrixAt(n++, M); keys.count = n; keys.castShadow = keys.receiveShadow = true; kb.add(keys);

  // no desk: a shadow on the dark and the screen's green spilling on the floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const pc2 = document.createElement('canvas'); pc2.width = pc2.height = 256; const g2 = pc2.getContext('2d');
  const rg = g2.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(90,255,170,.55)'); rg.addColorStop(.35, 'rgba(60,200,130,.2)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = rg; g2.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc2), transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, .001, .35); scene.add(pool);

  const key = new THREE.SpotLight(0xffcb94, 4.6, 0, .42, .9, 2); key.position.set(-1.5, 1.6, 1.9); key.target.position.set(.05, .35, .1); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0012; key.shadow.radius = 4; scene.add(key, key.target);
  const glow = new THREE.PointLight(0x4dffa0, .55, 1.6, 2); glow.position.set(0, .62, .7); scene.add(glow);
  const fill = new THREE.SpotLight(0xa8c4ff, .3, 0, .5, .9, 2); fill.position.set(1.3, 1, 2.2); fill.target.position.set(0, .4, 0); scene.add(fill, fill.target);
  const rim = new THREE.SpotLight(0xff3020, 9, 0, .45, .9, 2); rim.position.set(1.5, 1.05, -.85); rim.target.position.set(.1, .5, .05); scene.add(rim, rim.target);
  scene.add(new THREE.HemisphereLight(0x2a2a30, 0x0a0806, .22));

  const cam = new THREE.PerspectiveCamera(29, 1, .02, 40);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .45, .85); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let W = 0, H = 0;
  function resize() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width | 0); H = Math.max(1, r.height | 0);
    renderer.setSize(W, H, false); composer.setSize(W, H); cam.aspect = W / H;
    cam.fov = W / H < .9 ? 33 : 29; cam.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  // look around: the mouse tilts the camera, a drag swings it further, it eases back when left alone
  let tx = 0, ty = 0, ax = 0, ay = 0, drag = null, live = true, t0 = performance.now();
  addEventListener('pointermove', e => { if (drag) return; tx = (e.clientX / innerWidth - .5) * .5; ty = (e.clientY / innerHeight - .5) * .25; });
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, tx, ty, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); tx = Math.max(-1.1, Math.min(1.1, drag.tx + dx / 260)); ty = Math.max(-.35, Math.min(.5, drag.ty + dy / 400)); });
  const up = e => { if (!drag) return; const click = drag.moved < 6; drag = null; if (click) canvas.dispatchEvent(new CustomEvent('pcclick')); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  new IntersectionObserver(es => { live = es[0].isIntersecting; }).observe(canvas);

  renderer.shadowMap.needsUpdate = true;
  let blink = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!live || document.hidden) return;
    const t = (now - t0) / 1000;
    ax += (tx + Math.sin(t * .35) * .06 - ax) * .06; ay += (ty - ay) * .06;
    const R = small ? 4.3 : 3.75, a = ax * .9;
    cam.position.set(Math.sin(a) * R, .95 + ay * 2.2, Math.cos(a) * R); cam.lookAt(0, .42, 0);
    tags.rotation.z = Math.sin(t * 1.3) * .05; tags.rotation.x = Math.sin(t * .9) * .04;
    if (now > blink) { hdd.visible = !hdd.visible; blink = now + 60 + Math.random() * (hdd.visible ? 200 : 900); }
    composer.render();
  }
  requestAnimationFrame(frame);
  return { update: () => { tex.needsUpdate = true; } };
}
