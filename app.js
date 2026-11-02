// WIM: the war room. Live war markets from Polymarket's public APIs, read in the browser. Nothing here holds money:
// every bet is placed on Polymarket from the visitor's own account, and SOL funding goes through Polymarket's own bridge.
import { LAND } from './map.js?v=1';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const GAMMA = 'https://gamma-api.polymarket.com', CLOB = 'https://clob.polymarket.com', DATA = 'https://data-api.polymarket.com', BRIDGE = 'https://bridge.polymarket.com', PM = 'https://polymarket.com/event/';
const TAGS = ['geopolitics', 'military-strikes', 'iran', 'israel', 'middle-east', 'ukraine', 'russia', 'china', 'world'];
const WAR = /\b(wars?|strikes?|struck|attacks?|attacked|invades?|invaded|invasion|ceasefire|cease-fire|truce|military|missiles?|nuclear|troops|clash(es)?|blockade|drones?|bombs?|bombing|airstrikes?|conflict|peace|annex\w*|occup\w+|hostages?|offensive|escalat\w*|naval|navy|army|coup|regime|hezbollah|hamas|houthis?|nato|warships?|military action)\b/i;
const EXCL = /nobel|election|elected|primary|nominee|\bvote|tariff|interest rate|\bgdp\b|super bowl|\bnba\b|\bnfl\b|world cup|oscar|grammy|box office|bitcoin|crypto|token|stock|album|movie|tweet/i;
const REG = [
  ['Iran', 32.4, 53.7, /iran|tehran|hormuz|khamenei/i], ['Israel', 31.4, 34.9, /israel|gaza|hamas|\bidf\b|netanyahu|west bank/i],
  ['Lebanon', 33.9, 35.9, /lebanon|hezbollah|beirut/i], ['Ukraine', 49, 32, /ukrain|zelensk|kyiv|donbas|crimea|kharkiv|zaporizh/i],
  ['Russia', 56, 40, /russia|putin|moscow|kremlin/i], ['NATO', 51, 9, /\bnato\b/i], ['Taiwan', 23.7, 121, /taiwan|taipei/i],
  ['China', 34, 106, /china|chinese|beijing|xi jinping|south china sea/i], ['N. Korea', 40, 127, /north korea|kim jong|pyongyang/i],
  ['Venezuela', 7, -66, /venezuela|maduro|caracas/i], ['India · Pakistan', 29, 71, /india|pakistan|kashmir/i],
  ['Yemen', 15.5, 47.5, /yemen|houthi|red sea/i], ['Syria', 35, 38.5, /syria|damascus/i], ['Mexico', 23, -102, /mexico|cartel/i],
  ['Greenland', 72, -40, /greenland/i], ['Cuba', 21.5, -79, /cuba|havana/i], ['Panama', 9, -80, /panama/i], ['Iraq', 33, 44, /iraq|baghdad/i],
  ['Africa', 10, 22, /sudan|congo|ethiopia|somalia|sahel|niger\b|mali\b|libya/i], ['Serbia · Kosovo', 43, 21, /serbia|kosovo/i], ['Armenia · Azerbaijan', 40, 46, /armenia|azerbaijan/i],
];
const TYPES = [['STRIKES', /strike|attack|bomb|missile|drone|airstrike|\bhit\b|military action/i], ['CEASEFIRE', /ceasefire|truce|peace|deal|agreement|talks/i], ['INVASION', /invade|invasion|occup|annex|troops|ground/i], ['NUCLEAR', /nuclear|nuke|warhead/i]];

// ---------------------------------------------------------------- helpers
function get(u, o = {}) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), o.t || 14000);
  return fetch(u, { ...o, signal: c.signal }).then(r => { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
}
const J = s => { try { return typeof s === 'string' ? JSON.parse(s) : (s || []); } catch { return []; } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = p => p == null ? '—' : p < .01 && p > 0 ? '<1' : p > .99 && p < 1 ? '>99' : Math.round(p * 100) + '';
const cents = p => p == null ? '—' : (p * 100 < 1 ? (p * 100).toFixed(1) : Math.round(p * 100)) + '¢';
const usd = v => !isFinite(v) ? '—' : v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + Math.round(v);
const ago = s => { const d = Math.max(0, Date.now() / 1000 - s); return d < 60 ? Math.floor(d) + 's' : d < 3600 ? Math.floor(d / 60) + 'm' : d < 86400 ? Math.floor(d / 3600) + 'h' : Math.floor(d / 86400) + 'd'; };
const left = iso => { if (!iso) return ''; const d = (new Date(iso) - Date.now()) / 864e5; return d < 0 ? 'resolving' : d < 1 ? 'ends <1d' : d < 60 ? `ends ${Math.round(d)}d` : 'ends ' + new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
const shortLabel = s => String(s || '').replace(/^Will (the )?/i, '').replace(/\?$/, '');
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
async function copy(txt) { try { await navigator.clipboard.writeText(txt); toast('Copied'); } catch { toast('Copy failed, select it by hand'); } }
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- data
function shapeMarket(m) {
  const out = J(m.outcomes), px = J(m.outcomePrices).map(Number), tok = J(m.clobTokenIds);
  let yi = out.findIndex(o => /^yes$/i.test(o)); if (yi < 0) yi = 0;
  return { id: m.id, q: m.question, slug: m.slug, cid: m.conditionId, label: m.groupItemTitle || '', yes: isFinite(px[yi]) ? px[yi] : null, no: isFinite(px[1 - yi]) ? px[1 - yi] : null,
    yesName: out[yi] || 'Yes', noName: out[1 - yi] || 'No', tok: tok[yi], tokNo: tok[1 - yi], v24: +m.volume24hr || 0, vol: +m.volumeNum || +m.volume || 0, liq: +m.liquidityNum || +m.liquidity || 0,
    end: m.endDate, d1: +m.oneDayPriceChange || 0, desc: m.description || '' };
}
function shapeEvent(e) {
  const ms = (e.markets || []).filter(m => !m.closed && m.active !== false && m.archived !== true).map(shapeMarket).filter(m => m.yes != null);
  if (!ms.length) return null;
  const lead = [...ms].sort((a, b) => b.v24 - a.v24 || b.vol - a.vol)[0];
  const text = e.title + ' ' + lead.q;
  return { id: String(e.id), slug: e.slug, title: e.title, img: e.image || e.icon || '', v24: +e.volume24hr || ms.reduce((s, m) => s + m.v24, 0), vol: +e.volume || 0, liq: +e.liquidity || 0,
    end: e.endDate, ms: ms.sort((a, b) => new Date(a.end || 0) - new Date(b.end || 0)), lead, desc: e.description || lead.desc,
    regions: REG.filter(r => r[3].test(text)).map(r => r[0]), types: TYPES.filter(t => t[1].test(text)).map(t => t[0]) };
}
let EV = [], BY = new Map(), loadedAt = 0;
async function load() {
  const res = await Promise.allSettled(TAGS.map(t => get(`${GAMMA}/events?tag_slug=${t}&active=true&closed=false&archived=false&order=volume24hr&ascending=false&limit=60`)));
  const seen = new Map();
  for (const r of res) if (r.status === 'fulfilled' && Array.isArray(r.value)) for (const e of r.value) seen.set(String(e.id), e);
  if (!seen.size) throw new Error('no data');
  const out = [];
  for (const e of seen.values()) { if (!e.title || !WAR.test(e.title) || EXCL.test(e.title)) continue; const s = shapeEvent(e); if (s) out.push(s); }
  out.sort((a, b) => b.v24 - a.v24);
  return out;
}
const marketLink = (e, m) => PM + e.slug + (m && e.ms.length > 1 ? '/' + m.slug : '');
const hist = new Map();
async function priceHist(tok, range = '1w') {
  const k = tok + range; if (hist.has(k)) return hist.get(k);
  const [interval, fidelity] = { '1d': ['1d', 10], '1w': ['1w', 60], '1m': ['1m', 240], max: ['max', 1440] }[range];
  const p = get(`${CLOB}/prices-history?market=${tok}&interval=${interval}&fidelity=${fidelity}`).then(r => (r.history || []).map(h => [h.t, +h.p])).catch(() => []);
  hist.set(k, p); return p;
}

// ---------------------------------------------------------------- boot
function blocks(svg, word, px = 10, gap = 2, col = 'currentColor') {
  const GL = { W: ['XX.....XX', 'XX.....XX', 'XX.....XX', 'XX..X..XX', 'XX.XXX.XX', 'XXXXXXXXX', 'XXXX.XXXX', 'XXX...XXX', 'XX.....XX'], I: ['XXXXXX', 'XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX', 'XXXXXX'], M: ['XX.....XX', 'XXX...XXX', 'XXXX.XXXX', 'XXXXXXXXX', 'XX.XXX.XX', 'XX..X..XX', 'XX.....XX', 'XX.....XX', 'XX.....XX'] };
  let x0 = 0, r = '', k = 0;
  for (const ch of word) { GL[ch].forEach((row, ry) => [...row].forEach((c, rx) => { if (c === 'X') r += `<rect x="${x0 + rx * px}" y="${ry * px}" width="${px - 1.4}" height="${px - 1.4}" style="--i:${k++}"/>`; })); x0 += (GL[ch][0].length + gap) * px; }
  svg.setAttribute('viewBox', `0 0 ${x0 - gap * px} ${9 * px}`); svg.innerHTML = `<g fill="${col}">${r}</g>`;
}
$$('svg.wim').forEach(s => blocks(s, 'WIM'));
function boot() {
  const el = $('#boot');
  let first = true; try { first = !sessionStorage.getItem('wim:boot'); sessionStorage.setItem('wim:boot', '1'); } catch {}
  if (!first || reduce || location.hash.length > 1) { el.remove(); return; }
  document.documentElement.classList.add('booting');
  const line = $('#boot-line'), txt = 'C:\\WIM> WAR ROOM ONLINE'; let i = 0;
  const ty = setInterval(() => { line.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(ty); }, 38);
  const end = () => { if (!el.isConnected) return; el.classList.add('out'); document.documentElement.classList.remove('booting'); setTimeout(() => el.remove(), 700); };
  el.addEventListener('pointerdown', end); addEventListener('keydown', end, { once: true });
  setTimeout(end, 2300);
}

// ---------------------------------------------------------------- clock + reveal
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
$$('.rv').forEach(el => io.observe(el));

const seenCards = new Set();
const stIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; const el = e.target; el.classList.add('in'); stIO.unobserve(el);
  if (el.dataset.id) seenCards.add(el.dataset.id);
  setTimeout(() => el.style.setProperty('--d', '0s'), 1100 + parseFloat(el.style.getPropertyValue('--d') || 0) * 1000);
}), { threshold: .06, rootMargin: '0px 0px -5% 0px' });
function stagger(sel, root = document, step = .06) {
  if (reduce) return;
  $$(sel, root).forEach((el, i) => { if (el.classList.contains('in')) return; el.classList.add('st'); el.style.setProperty('--d', ((i % 9) * step).toFixed(2) + 's'); stIO.observe(el); });
}
stagger('.stats > div', document, .08); stagger('.steps li', document, .12); stagger('.fund .panel', document, .15); stagger('.faq details', document, .07);
const prog = document.createElement('div'); prog.className = 'prog'; document.body.appendChild(prog);
const heroL = $('.hero .hg > div'), heroR = $('.pcbox'); let sy = -1, sq = false;
function onScroll() {
  sq = false; const y = scrollY; if (y === sy) return; sy = y;
  const max = document.documentElement.scrollHeight - innerHeight; prog.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  if (reduce || y > innerHeight * 1.3) return;
  heroL.style.transform = `translateY(${(y * .28).toFixed(1)}px)`; heroL.style.opacity = Math.max(0, 1 - y / 620).toFixed(3);
  heroR.style.transform = `translateY(${(y * .12).toFixed(1)}px) scale(${(1 - Math.min(.14, y / 3600)).toFixed(4)})`;
}
addEventListener('scroll', () => { if (!sq) { sq = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();

// ---------------------------------------------------------------- the CRT (hero)
const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 768;
const sx = scr.getContext('2d');
let pcApi = null, screenIdx = 0, screenList = [], screenTimer = 0;
const G = '#86ffbe', GD = '#1f8a55', GDD = '#0d3a25', RED = '#ff3d2e';
function wrap(ctx, text, maxW) { const words = String(text).split(/\s+/), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
async function drawScreen() {
  const x = sx, W = 1024, H = 768;
  const r = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 720); r.addColorStop(0, '#08281a'); r.addColorStop(1, '#010806'); x.fillStyle = r; x.fillRect(0, 0, W, H);
  x.textBaseline = 'alphabetic'; x.shadowColor = G; x.shadowBlur = 12;
  x.font = '38px VT323'; x.fillStyle = GD; x.fillText('WIM.EXE', 54, 76);
  const tm = new Date().toISOString().slice(11, 16) + ' UTC'; x.fillText(tm, W - 54 - x.measureText(tm).width - 120, 76);
  x.fillStyle = RED; x.shadowColor = RED; x.fillRect(W - 160, 54, 18, 18); x.fillText('LIVE', W - 130, 76);
  x.shadowBlur = 0; x.fillStyle = GDD; x.fillRect(48, 96, W - 96, 3);
  const e = screenList[screenIdx % Math.max(1, screenList.length)];
  if (!e) {
    x.shadowColor = G; x.shadowBlur = 18; x.fillStyle = G; x.font = '64px VT323'; x.fillText('CONNECTING TO THE FRONT...', 64, 380);
  } else {
    const m = e.lead;
    x.shadowColor = RED; x.shadowBlur = 10; x.fillStyle = RED; x.font = '40px VT323';
    x.fillText(((e.regions[0] || 'WORLD') + (e.types[0] ? ' · ' + e.types[0] : '')).toUpperCase(), 64, 158);
    x.shadowColor = G; x.shadowBlur = 14; x.fillStyle = G; x.font = '56px VT323';
    const lines = wrap(x, (m.label && e.ms.length > 1 ? e.title + ' — ' + m.label : e.title).toUpperCase(), W - 128).slice(0, 3);
    lines.forEach((l, i) => x.fillText(l, 64, 222 + i * 54));
    const y0 = 222 + lines.length * 54 + 130;
    x.font = '210px VT323'; x.shadowBlur = 26; const ptxt = pct(m.yes) + '%'; x.fillText(ptxt, 58, y0);
    const pw = x.measureText(ptxt).width;
    x.font = '44px VT323'; x.shadowBlur = 10; x.fillStyle = GD; x.fillText(m.yesName.toUpperCase() + ' CHANCE', 72 + pw, y0 - 92);
    if (m.d1) { x.fillStyle = m.d1 > 0 ? G : RED; x.fillText((m.d1 > 0 ? '▲ ' : '▼ ') + Math.abs(m.d1 * 100).toFixed(1) + ' PTS TODAY', 72 + pw, y0 - 42); }
    x.fillStyle = GDD; x.fillRect(64, y0 + 26, W - 128, 18); x.fillStyle = G; x.shadowBlur = 16; x.fillRect(64, y0 + 26, (W - 128) * Math.max(0, Math.min(1, m.yes)), 18);
    const h = await priceHist(m.tok, '1w');
    if (h.length > 2 && screenList[screenIdx % screenList.length] === e) {
      const top = y0 + 70, hh = Math.max(40, H - 120 - top), ys = h.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), sp = Math.max(.02, hi - lo);
      x.beginPath(); h.forEach(([, p], i) => { const px = 64 + i / (h.length - 1) * (W - 128), py = top + hh - (p - lo) / sp * hh; i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.strokeStyle = G; x.lineWidth = 4; x.shadowBlur = 12; x.stroke();
    }
    x.shadowBlur = 0; x.fillStyle = GD; x.font = '36px VT323';
    x.fillText(`24H ${usd(e.v24)}   ·   CLICK THE SCREEN TO OPEN`, 64, H - 62);
    x.fillText(`${(screenIdx % screenList.length) + 1}/${screenList.length}`, W - 130, H - 62);
  }
  x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.24)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 2);
  const v = x.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 760); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  pcApi?.update();
}
function cycleScreen(step = 1) { screenIdx = (screenIdx + step + screenList.length) % Math.max(1, screenList.length); drawScreen(); clearInterval(screenTimer); screenTimer = setInterval(() => cycleScreen(1), 6000); }
async function startPC() {
  await document.fonts.load('40px VT323').catch(() => {});
  drawScreen();
  const cv = $('#pc');
  try {
    if (!window.WebGLRenderingContext) throw 0;
    const mod = await Promise.race([import('./scene.js?v=2'), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 9000))]);
    pcApi = mod.mountPC(cv, scr);
    cv.addEventListener('pcclick', () => { const e = screenList[screenIdx % screenList.length]; if (e) openEvent(e.id); });
  } catch (err) {
    cv.replaceWith(Object.assign(scr, { id: 'pc2', className: 'crt2', title: 'Open this market' }));
    scr.addEventListener('click', () => { const e = screenList[screenIdx % screenList.length]; if (e) openEvent(e.id); });
  }
  $('#scr-prev').onclick = () => cycleScreen(-1); $('#scr-next').onclick = () => cycleScreen(1);
}

// ---------------------------------------------------------------- stats
function countUp(el, to, fmt) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (reduce || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), d = 900;
  const step = now => { const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function stats() {
  const n = EV.reduce((s, e) => s + e.ms.length, 0), v = EV.reduce((s, e) => s + e.v24, 0), l = EV.reduce((s, e) => s + e.liq, 0);
  countUp($('#st-n'), n, x => Math.round(x)); countUp($('#st-e'), EV.length, x => Math.round(x));
  countUp($('#st-v'), v, usd); countUp($('#st-l'), l, usd);
  let mv = null; for (const e of EV) for (const m of e.ms) if (m.v24 > 2000 && (!mv || Math.abs(m.d1) > Math.abs(mv.m.d1))) mv = { e, m };
  const el = $('#st-m');
  if (mv && mv.m.d1) { el.innerHTML = `<b class="${mv.m.d1 > 0 ? 'up' : 'dn'}">${mv.m.d1 > 0 ? '▲' : '▼'} ${Math.abs(mv.m.d1 * 100).toFixed(1)} pts</b> <span>${esc(shortLabel(mv.e.ms.length > 1 ? mv.e.title + ' · ' + mv.m.label : mv.e.title))}</span>`; el.onclick = () => openEvent(mv.e.id, mv.m.id); }
  else el.textContent = 'quiet day';
}

// ---------------------------------------------------------------- the map
const map = { cv: $('#map'), pings: [], hover: null, t0: performance.now(), revT: 0 };
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { map.revT = performance.now() + 250; o.disconnect(); } }, { threshold: .25 }).observe($('#map'));
function proj(lat, lon, W, H) { return [(lon + 180) / 360 * W, (78 - lat) / 140 * H]; }
function buildPings() {
  const agg = new Map();
  for (const e of EV) for (const r of e.regions) { const a = agg.get(r) || { name: r, n: 0, v: 0, top: null }; a.n++; a.v += e.v24; if (!a.top || e.v24 > a.top.v24) a.top = e; agg.set(r, a); }
  const maxV = Math.max(1, ...[...agg.values()].map(a => a.v));
  map.pings = [...agg.values()].map(a => { const R = REG.find(r => r[0] === a.name); return { ...a, lat: R[1], lon: R[2], k: Math.sqrt(a.v / maxV) }; }).sort((a, b) => b.v - a.v);
  const firstList = !$('#map-list .reg');
  $('#map-list').innerHTML = map.pings.map(p => `<button class="reg" data-r="${esc(p.name)}"><i></i><span>${esc(p.name)}</span><b>${p.n}</b><em>${usd(p.v)}</em></button>`).join('') || '<p class="dim">No live fronts right now.</p>';
  if (firstList) stagger('#map-list .reg', document, .05);
}
function drawMap(now) {
  const cv = map.cv, r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = r.width, H = r.height;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const cw = W / 200, ch = H / 82, t = (now - map.t0) / 1000;
  const rv = reduce ? 1 : map.revT ? Math.max(0, Math.min(1, (now - map.revT) / 1500)) : 0, lim = rv * W * 1.08;
  const sweep = (t * .09 % 1.25) * W;
  x.strokeStyle = 'rgba(40,140,90,.12)'; x.lineWidth = 1;
  for (let i = 1; i < 12; i++) { x.beginPath(); x.moveTo(i * W / 12, 0); x.lineTo(i * W / 12, H); x.stroke(); }
  for (let j = 1; j < 5; j++) { x.beginPath(); x.moveTo(0, j * H / 5); x.lineTo(W, j * H / 5); x.stroke(); }
  for (let j = 0; j < 82; j++) { const row = LAND[j]; for (let i = 0; i < 200; i++) if (row[i] === 'X') {
    const px = (i + .5) * cw, py = (j + .5) * ch; if (px > lim) continue; const d = sweep - px, lit = (d > 0 && d < 120 ? 1 - d / 120 : 0) + (rv < 1 && lim - px < 40 ? 1 - (lim - px) / 40 : 0);
    x.fillStyle = `rgba(${70 + lit * 120 | 0},${200 + lit * 55 | 0},${140 + lit * 60 | 0},${.32 + lit * .6})`; x.fillRect(px - cw * .28, py - cw * .28, cw * .56, cw * .56);
  } }
  const g = x.createLinearGradient(sweep - 140, 0, sweep, 0); g.addColorStop(0, 'rgba(134,255,190,0)'); g.addColorStop(1, 'rgba(134,255,190,.16)'); x.fillStyle = g; x.fillRect(sweep - 140, 0, 140, H);
  x.fillStyle = 'rgba(134,255,190,.55)'; x.fillRect(sweep, 0, 1.5, H);
  for (const p of map.pings) {
    const [px, py] = proj(p.lat, p.lon, W, H); if (px > lim - 30) continue; const pop = Math.min(1, (lim - 30 - px) / 90), R = (3 + p.k * 7) * pop, on = map.hover === p || st.reg === p.name;
    for (let k = 0; k < 3; k++) { const ph = ((t * .6 + k / 3 + p.k) % 1); x.strokeStyle = `rgba(255,61,46,${(1 - ph) * .7})`; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, R + ph * (18 + p.k * 26), 0, 7); x.stroke(); }
    x.shadowColor = '#ff3d2e'; x.shadowBlur = on ? 22 : 12; x.fillStyle = on ? '#fff' : '#ff4a38'; x.beginPath(); x.arc(px, py, R, 0, 7); x.fill(); x.shadowBlur = 0;
    if (on || p.k > .55) { x.font = '12px Silkscreen'; x.fillStyle = on ? '#fff' : 'rgba(255,200,190,.85)'; x.fillText(p.name.toUpperCase(), px + R + 6, py + 4); }
  }
  requestAnimationFrame(drawMap);
}
function pingAt(ev) {
  const r = map.cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
  let best = null, bd = 1e9; for (const p of map.pings) { const [px, py] = proj(p.lat, p.lon, r.width, r.height), d = Math.hypot(px - mx, py - my); if (d < bd) { bd = d; best = p; } }
  return bd < 28 ? best : null;
}
map.cv.addEventListener('pointermove', ev => {
  const p = pingAt(ev); map.hover = p; map.cv.style.cursor = p ? 'pointer' : 'default';
  const tip = $('#map-tip');
  if (!p) { tip.hidden = true; return; }
  const r = map.cv.getBoundingClientRect(), m = p.top.lead;
  tip.hidden = false; tip.style.left = Math.min(r.width - 250, ev.clientX - r.left + 14) + 'px'; tip.style.top = (ev.clientY - r.top + 14) + 'px';
  tip.innerHTML = `<b>${esc(p.name)}</b><span>${p.n} live market${p.n > 1 ? 's' : ''} · ${usd(p.v)} 24h</span><em>${esc(p.top.title)}</em><strong>${pct(m.yes)}% ${esc(m.yesName)}</strong>`;
});
map.cv.addEventListener('pointerleave', () => { map.hover = null; $('#map-tip').hidden = true; });
map.cv.addEventListener('click', ev => { const p = pingAt(ev); if (p) pickRegion(p.name, true); });
$('#map-list').addEventListener('click', ev => { const b = ev.target.closest('.reg'); if (b) pickRegion(b.dataset.r, true); });
function pickRegion(r, go) { st.reg = st.reg === r && !go ? 'ALL' : r; renderChips(); renderBoard(); if (go) $('#board').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }

// ---------------------------------------------------------------- the board
const st = { reg: 'ALL', type: 'ALL', sort: 'vol', q: '' };
function renderChips() {
  const regs = ['ALL', ...map.pings.map(p => p.name)];
  $('#chips-reg').innerHTML = regs.map(r => `<button class="chip${st.reg === r ? ' on' : ''}" data-r="${esc(r)}">${esc(r === 'ALL' ? 'ALL FRONTS' : r)}</button>`).join('');
  $('#chips-type').innerHTML = ['ALL', ...TYPES.map(t => t[0])].map(t => `<button class="chip t${st.type === t ? ' on' : ''}" data-t="${t}">${t === 'ALL' ? 'EVERY KIND' : t}</button>`).join('');
}
$('#chips-reg').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { st.reg = b.dataset.r; renderChips(); renderBoard(); } });
$('#chips-type').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { st.type = b.dataset.t; renderChips(); renderBoard(); } });
$('#sort').addEventListener('change', e => { st.sort = e.target.value; renderBoard(); });
$('#q').addEventListener('input', e => { st.q = e.target.value.trim().toLowerCase(); renderBoard(); });
addEventListener('keydown', e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#q').focus(); } if (e.key === 'Escape') closeModal(); });
function list() {
  let a = EV.filter(e => (st.reg === 'ALL' || e.regions.includes(st.reg)) && (st.type === 'ALL' || e.types.includes(st.type)) && (!st.q || (e.title + ' ' + e.ms.map(m => m.q).join(' ')).toLowerCase().includes(st.q)));
  const by = { vol: (x, y) => y.v24 - x.v24, liq: (x, y) => y.liq - x.liq, move: (x, y) => Math.abs(y.lead.d1) - Math.abs(x.lead.d1), end: (x, y) => new Date(x.end || 9e15) - new Date(y.end || 9e15), odds: (x, y) => y.lead.yes - x.lead.yes };
  return a.sort(by[st.sort]);
}
const prevYes = new Map();
function card(e) {
  const m = e.lead, was = prevYes.get(m.id), flash = was != null && was !== m.yes ? (m.yes > was ? ' fl-up' : ' fl-dn') : '';
  prevYes.set(m.id, m.yes);
  const others = e.ms.filter(x => x !== m).slice(0, 3);
  return `<article class="card${flash}${seenCards.has(e.id) || reduce ? '' : ' st'}" data-id="${e.id}" tabindex="0">
    <div class="c-top"><span class="c-reg">${esc([(e.regions[0] || 'World'), e.types[0]].filter(Boolean).join(' · '))}</span><span class="c-end">${esc(left(m.end || e.end))}</span></div>
    <h3>${esc(e.title)}</h3>
    <div class="c-lead"><div class="c-pct">${pct(m.yes)}<i>%</i></div><div class="c-meta"><span>${esc(e.ms.length > 1 ? m.label || m.yesName : m.yesName)}</span>${m.d1 ? `<b class="${m.d1 > 0 ? 'up' : 'dn'}">${m.d1 > 0 ? '▲' : '▼'} ${Math.abs(m.d1 * 100).toFixed(1)}</b>` : '<b class="fl">— 0.0</b>'}</div><svg class="spark" data-tok="${esc(m.tok || '')}" viewBox="0 0 100 32" preserveAspectRatio="none"></svg></div>
    <div class="c-bar"><i style="width:${Math.max(0, Math.min(100, m.yes * 100))}%"></i></div>
    ${others.length ? `<ul class="c-list">${others.map(o => `<li><span>${esc(o.label || shortLabel(o.q))}</span><b>${pct(o.yes)}%</b></li>`).join('')}${e.ms.length > 4 ? `<li class="more">+${e.ms.length - 4} more</li>` : ''}</ul>` : ''}
    <div class="c-foot"><span class="c-vol">${usd(e.v24)} <em>24h</em></span><a class="bet yes" href="${marketLink(e, m)}" target="_blank" rel="noopener">${esc(m.yesName.toUpperCase())} ${cents(m.yes)}</a><a class="bet no" href="${marketLink(e, m)}" target="_blank" rel="noopener">${esc(m.noName.toUpperCase())} ${cents(m.no)}</a></div>
  </article>`;
}
const sparkIO = new IntersectionObserver(es => es.forEach(async en => {
  if (!en.isIntersecting) return; sparkIO.unobserve(en.target);
  const svg = en.target, tok = svg.dataset.tok; if (!tok) return;
  const h = await priceHist(tok, '1w'); if (h.length < 3) return;
  const ys = h.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), sp = Math.max(.01, hi - lo);
  const pts = h.map(([, p], i) => `${(i / (h.length - 1) * 100).toFixed(2)},${(30 - (p - lo) / sp * 28).toFixed(2)}`).join(' ');
  const up = ys[ys.length - 1] >= ys[0];
  svg.innerHTML = `<polyline points="0,32 ${pts} 100,32" class="sa ${up ? 'up' : 'dn'}"/><polyline points="${pts}" class="sl ${up ? 'up' : 'dn'}"/>`;
}), { rootMargin: '200px' });
function renderBoard() {
  const a = list(), el = $('#cards');
  $('#count').textContent = `${a.length} of ${EV.length} events`;
  el.innerHTML = a.length ? a.map(card).join('') : `<p class="empty">Nothing on this front right now. <button class="link" id="reset">Show every front</button></p>`;
  $('#reset')?.addEventListener('click', () => { Object.assign(st, { reg: 'ALL', type: 'ALL', q: '' }); $('#q').value = ''; renderChips(); renderBoard(); });
  $$('.spark', el).forEach(s => sparkIO.observe(s));
  stagger('.card.st', el, .05);
}
$('#cards').addEventListener('click', e => { if (e.target.closest('a')) return; const c = e.target.closest('.card'); if (c) openEvent(c.dataset.id); });
$('#cards').addEventListener('keydown', e => { if (e.key === 'Enter') { const c = e.target.closest('.card'); if (c) openEvent(c.dataset.id); } });
$('#cards').addEventListener('pointermove', e => { const c = e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%'); c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%'); });

// ---------------------------------------------------------------- the market file (modal)
const md = { e: null, m: null, range: '1w', h: [] };
function closeModal() { const o = $('#modal'); if (o.hidden) return; o.hidden = true; document.documentElement.classList.remove('locked'); if (location.hash.startsWith('#/m/')) history.replaceState(null, '', location.pathname); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('.x')) closeModal(); });
function openEvent(id, mid) {
  const e = BY.get(String(id)); if (!e) return;
  md.e = e; md.m = e.ms.find(m => m.id === mid) || e.lead;
  const o = $('#modal'); o.hidden = false; document.documentElement.classList.add('locked');
  history.replaceState(null, '', '#/m/' + e.id);
  $('#m-img').src = e.img || ''; $('#m-img').hidden = !e.img;
  $('#m-tags').innerHTML = [...e.regions, ...e.types].map(t => `<span>${esc(t)}</span>`).join('') || '<span>WORLD</span>';
  $('#m-title').textContent = e.title;
  $('#m-stats').innerHTML = `<div><i>24h volume</i><b>${usd(e.v24)}</b></div><div><i>total volume</i><b>${usd(e.vol)}</b></div><div><i>liquidity</i><b>${usd(e.liq)}</b></div><div><i>markets</i><b>${e.ms.length}</b></div>`;
  $('#m-rows').innerHTML = e.ms.map(m => `<div class="row${m === md.m ? ' on' : ''}" data-m="${m.id}"><span class="lab">${esc(e.ms.length > 1 ? (m.label || shortLabel(m.q)) : m.q)}</span><b class="p">${pct(m.yes)}%</b>${m.d1 ? `<em class="${m.d1 > 0 ? 'up' : 'dn'}">${m.d1 > 0 ? '▲' : '▼'}${Math.abs(m.d1 * 100).toFixed(1)}</em>` : '<em></em>'}<a class="bet yes" href="${marketLink(e, m)}" target="_blank" rel="noopener">${esc(m.yesName)} ${cents(m.yes)}</a><a class="bet no" href="${marketLink(e, m)}" target="_blank" rel="noopener">${esc(m.noName)} ${cents(m.no)}</a></div>`).join('');
  const d = e.desc || ''; $('#m-rules').textContent = d.length > 900 ? d.slice(0, 900) + '…' : d;
  $('#m-open').href = PM + e.slug;
  pickMarket(md.m);
}
$('#m-rows').addEventListener('click', ev => { if (ev.target.closest('a')) return; const r = ev.target.closest('.row'); if (!r) return; const m = md.e.ms.find(x => x.id === r.dataset.m); if (m) pickMarket(m); });
$$('#m-range button').forEach(b => b.onclick = () => { md.range = b.dataset.r; $$('#m-range button').forEach(x => x.classList.toggle('on', x === b)); chart(); });
function pickMarket(m) {
  md.m = m; $$('#m-rows .row').forEach(r => r.classList.toggle('on', r.dataset.m === m.id));
  $('#m-q').textContent = m.q; $('#m-big').textContent = pct(m.yes) + '%'; $('#m-yn').textContent = m.yesName + ' chance';
  $('#m-chg').innerHTML = m.d1 ? `<b class="${m.d1 > 0 ? 'up' : 'dn'}">${m.d1 > 0 ? '▲' : '▼'} ${Math.abs(m.d1 * 100).toFixed(1)} pts today</b>` : '';
  $('#m-yes').href = $('#m-no').href = marketLink(md.e, m);
  $('#m-yes').textContent = `BET ${m.yesName.toUpperCase()} · ${cents(m.yes)}`; $('#m-no').textContent = `BET ${m.noName.toUpperCase()} · ${cents(m.no)}`;
  chart(); book(m); trades(m);
}
async function chart() {
  const m = md.m, svg = $('#m-chart'), tok = m.tok; svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" class="ld">LOADING…</text>';
  const h = await priceHist(tok, md.range); if (md.m !== m) return;
  md.h = h;
  if (h.length < 2) { svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" class="ld">NO PRICE HISTORY YET</text>'; return; }
  const W = 600, H = 220, ys = h.map(p => p[1]), lo = Math.max(0, Math.min(...ys) - .03), hi = Math.min(1, Math.max(...ys) + .03), sp = Math.max(.02, hi - lo);
  const X = i => i / (h.length - 1) * W, Y = p => H - (p - lo) / sp * H;
  const pts = h.map(([, p], i) => `${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#86ffbe" stop-opacity=".35"/><stop offset="1" stop-color="#86ffbe" stop-opacity="0"/></linearGradient></defs>
    ${[.25, .5, .75].map(k => `<line x1="0" x2="${W}" y1="${H * k}" y2="${H * k}" class="gl"/>`).join('')}
    <polygon points="0,${H} ${pts} ${W},${H}" fill="url(#ga)"/><polyline points="${pts}" class="ln"/>
    <text x="4" y="14" class="ax">${pct(hi)}%</text><text x="4" y="${H - 6}" class="ax">${pct(lo)}%</text>
    <line id="cx" y1="0" y2="${H}" class="cx" visibility="hidden"/><circle id="cd" r="5" class="cd" visibility="hidden"/>`;
}
$('#m-chart').addEventListener('pointermove', ev => {
  const h = md.h; if (h.length < 2) return; const svg = $('#m-chart'), r = svg.getBoundingClientRect(), k = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), i = Math.round(k * (h.length - 1));
  const vb = svg.viewBox.baseVal, ys = h.map(p => p[1]), lo = Math.max(0, Math.min(...ys) - .03), hi = Math.min(1, Math.max(...ys) + .03), sp = Math.max(.02, hi - lo);
  const x = i / (h.length - 1) * vb.width, y = vb.height - (h[i][1] - lo) / sp * vb.height;
  const cx = $('#cx'), cd = $('#cd'); if (!cx) return;
  cx.setAttribute('x1', x); cx.setAttribute('x2', x); cx.setAttribute('visibility', 'visible'); cd.setAttribute('cx', x); cd.setAttribute('cy', y); cd.setAttribute('visibility', 'visible');
  $('#m-hover').textContent = `${pct(h[i][1])}% · ${new Date(h[i][0] * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
});
$('#m-chart').addEventListener('pointerleave', () => { $('#cx')?.setAttribute('visibility', 'hidden'); $('#cd')?.setAttribute('visibility', 'hidden'); $('#m-hover').textContent = ''; });
async function book(m) {
  const el = $('#m-book'); el.innerHTML = '<p class="dim">Loading the book…</p>';
  try {
    const b = await get(`${CLOB}/book?token_id=${m.tok}`); if (md.m !== m) return;
    const bids = (b.bids || []).map(x => [+x.price, +x.size]).sort((a, c) => c[0] - a[0]).slice(0, 6), asks = (b.asks || []).map(x => [+x.price, +x.size]).sort((a, c) => a[0] - c[0]).slice(0, 6);
    const mx = Math.max(1, ...bids.map(x => x[1] * x[0]), ...asks.map(x => x[1] * x[0]));
    const row = (x, side) => `<div class="br ${side}"><i style="width:${(x[1] * x[0] / mx * 100).toFixed(1)}%"></i><span>${cents(x[0])}</span><b>${usd(x[0] * x[1])}</b></div>`;
    const spread = asks[0] && bids[0] ? cents(asks[0][0] - bids[0][0]) : '—';
    el.innerHTML = `<div class="bk"><div><h5>ASKS · sell ${esc(m.yesName)}</h5>${asks.slice().reverse().map(x => row(x, 'a')).join('') || '<p class="dim">empty</p>'}</div><div class="spr">spread ${spread}</div><div><h5>BIDS · buy ${esc(m.yesName)}</h5>${bids.map(x => row(x, 'b')).join('') || '<p class="dim">empty</p>'}</div></div>`;
  } catch { el.innerHTML = '<p class="dim">The order book did not load. It is always on Polymarket.</p>'; }
}
async function trades(m) {
  const el = $('#m-trades'); el.innerHTML = '<p class="dim">Loading trades…</p>';
  try {
    const t = await get(`${DATA}/trades?market=${m.cid}&limit=14`); if (md.m !== m) return;
    el.innerHTML = (t || []).map(x => `<div class="tr"><span class="${x.side === 'BUY' ? 'up' : 'dn'}">${x.side}</span><b>${esc(x.outcome)}</b><em>${usd(x.size * x.price)}</em><i>${cents(+x.price)}</i><small>${ago(x.timestamp)}</small></div>`).join('') || '<p class="dim">No trades yet.</p>';
  } catch { el.innerHTML = '<p class="dim">Trades did not load.</p>'; }
}

// ---------------------------------------------------------------- the tape
const seenT = new Set(); let tapeFirst = true, tapeSeen = false;
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { setTimeout(() => { tapeSeen = true; }, 2500); o.disconnect(); } }, { threshold: .15 }).observe($('.tapebox'));
async function tape() {
  const top = EV.slice(0, 10), cids = top.map(e => e.lead.cid).filter(Boolean);
  if (!cids.length) return;
  let rows = [];
  try { rows = await get(`${DATA}/trades?market=${cids.join(',')}&limit=60`); } catch {}
  if (!Array.isArray(rows) || !rows.length) { const rs = await Promise.allSettled(cids.slice(0, 6).map(c => get(`${DATA}/trades?market=${c}&limit=10`))); rows = rs.flatMap(r => r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []); }
  rows.sort((a, b) => b.timestamp - a.timestamp);
  const el = $('#tape-rows');
  const html = rows.slice(0, 40).map(x => {
    const k = x.transactionHash + x.asset + x.size, fresh = !tapeFirst && !seenT.has(k); seenT.add(k);
    const val = x.size * x.price, ev = EV.find(e => e.slug === x.eventSlug), whale = val >= 1000;
    return `<div class="tp${fresh ? ' new' : ''}${whale ? ' whale' : ''}${tapeSeen || reduce ? '' : ' st'}" ${ev ? `data-id="${ev.id}"` : ''}><small>${ago(x.timestamp)}</small><span class="${x.side === 'BUY' ? 'up' : 'dn'}">${x.side}</span><b>${esc(x.outcome)}</b><em>${usd(val)}</em><i>${cents(+x.price)}</i><p>${esc(x.title)}</p>${whale ? '<strong>WHALE</strong>' : ''}</div>`;
  }).join('');
  el.innerHTML = html || '<p class="dim">The tape is quiet.</p>'; tapeFirst = false;
  if (!tapeSeen) stagger('.tp.st', el, .035);
  $('#tape-at').textContent = 'updated ' + new Date().toLocaleTimeString();
}
$('#tape-rows').addEventListener('click', e => { const r = e.target.closest('.tp[data-id]'); if (r) openEvent(r.dataset.id); });

// ---------------------------------------------------------------- fund with SOL (Polymarket's own bridge)
$('#fund-go').addEventListener('click', async () => {
  const a = $('#fund-addr').value.trim(), out = $('#fund-out');
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { out.innerHTML = '<p class="warn">That is not a Polymarket wallet address. It starts with 0x and is 42 characters long.</p>'; return; }
  out.innerHTML = '<p class="dim">Asking Polymarket for your SOL deposit address…</p>';
  try {
    const [dep, prof] = await Promise.all([
      get(`${BRIDGE}/deposit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: a }) }),
      get(`${GAMMA}/public-profile?address=${a}`).catch(() => null)]);
    const svm = dep?.address?.svm; if (!svm) throw new Error('no address');
    const who = prof && (prof.name || prof.pseudonym) ? `<p class="ok">Polymarket account found: <b>${esc(prof.name || prof.pseudonym)}</b></p>` : `<p class="warn">No public Polymarket profile matched this address. Check it again before you send anything.</p>`;
    out.innerHTML = `${who}<div class="addr"><i>Send SOL on Solana to</i><code id="svm">${esc(svm)}</code><button class="btn sm" id="svm-copy">COPY</button></div>
      <p class="dim">Polymarket's bridge converts it and credits your Polymarket balance in USDC. Send at least about $2 worth; smaller deposits are ignored. Other chains: EVM <code>${esc(dep.address.evm || '—')}</code> · BTC <code>${esc(dep.address.btc || '—')}</code></p>
      <button class="btn ghost sm" id="svm-check">CHECK MY DEPOSITS</button><div id="svm-status"></div>`;
    $('#svm-copy').onclick = () => copy(svm);
    $('#svm-check').onclick = async () => {
      const s = $('#svm-status'); s.innerHTML = '<p class="dim">Checking…</p>';
      try {
        const r = await get(`${BRIDGE}/status/${svm}`), txs = r.transactions || r.data || (Array.isArray(r) ? r : []);
        s.innerHTML = txs.length ? txs.slice(0, 6).map(t => `<div class="dep"><b>${esc(t.status || 'seen')}</b><span>${esc(t.fromAmountBaseUnit ? (t.fromAmountBaseUnit / 1e9).toFixed(4) + ' SOL' : t.amount || '')}</span><small>${t.createdTimeMs ? new Date(t.createdTimeMs).toLocaleString() : ''}</small></div>`).join('') : '<p class="dim">No deposits seen yet. They show up a minute or two after the transfer confirms.</p>';
      } catch { s.innerHTML = '<p class="dim">The bridge did not answer. Try again in a moment.</p>'; }
    };
  } catch { out.innerHTML = '<p class="warn">Polymarket\'s bridge did not answer. Try again, or deposit from polymarket.com.</p>'; }
});

// ---------------------------------------------------------------- run
$$('.mag').forEach(b => { b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .15}px,${(e.clientY - r.top - r.height / 2) * .25}px)`; }); b.addEventListener('pointerleave', () => { b.style.transform = ''; }); });
$$('.faq details').forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('.faq details').forEach(o => { if (o !== d) o.open = false; }); }));
async function refresh() {
  try {
    const ev = await load(); EV = ev; BY = new Map(EV.map(e => [e.id, e])); loadedAt = Date.now();
    document.documentElement.classList.remove('offline');
    screenList = EV.slice(0, 10); if (!screenTimer) cycleScreen(0); else drawScreen();
    stats(); buildPings(); renderChips(); renderBoard();
    const m = location.hash.match(/^#\/m\/(\w+)/); if (m && $('#modal').hidden) openEvent(m[1]);
    tape();
  } catch (err) {
    if (!EV.length) { document.documentElement.classList.add('offline'); $('#cards').innerHTML = '<p class="empty">Polymarket did not answer. Retrying…</p>'; }
  }
}
async function runIntro() {
  const el = $('#intro'), H = document.documentElement;
  if (!el) return;
  if (!H.classList.contains('intro-on')) { el.remove(); return; }
  try {
    const mod = await Promise.race([import('./intro.js?v=1'), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]);
    await mod.playIntro(el);
  } catch { el.classList.add('out'); }
  setTimeout(() => { H.classList.remove('intro-on'); el.remove(); }, 850);
}
runIntro(); startPC(); requestAnimationFrame(drawMap); refresh();
setInterval(refresh, 60000); setInterval(() => { if (EV.length && !document.hidden) tape(); }, 20000);
