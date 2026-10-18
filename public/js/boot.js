// Starts a capsule page and guarantees its link. Everything the scene needs is fetched
// with real byte progress behind the loading screen, then the scene starts. If anything
// fails on the way (a missing file, no WebGL, an error while building or rendering, a
// lost GPU context, a stalled network), the page switches once to its fallback: the
// loading screen and the open button go away and the original link stays. This module
// does not import the 3D engine, so the fallback works whatever else fails to load.
// Without JavaScript the page stays in its static state, which CSS renders the same way.

const doc = document.documentElement;
const STALL = 10000; // no download progress for this long: give up
const LIMIT = 45000; // and never wait longer than this in total, building the scene included

let mode = 'loading'; // loading | ready | fallback
let watch = null;
let fetched = false;
let giveUp = null;
const listeners = [];

const $ = (sel) => document.querySelector(sel);

export const isFallback = () => mode === 'fallback';

// Idempotent: the first call wins, later calls (and a late scene start) change nothing.
export function fallback(reason = 'error') {
  if (mode === 'fallback') return;
  // once the scene runs, the link is its job; only a lost context still needs this path
  const wasReady = mode === 'ready';
  mode = 'fallback';
  clearTimeout(watch);
  clearTimeout(giveUp);
  window.__juhuliaFallback = reason;
  doc.dataset.state = 'fallback';
  const focused = document.activeElement;
  $('[data-loader]')?.remove();
  $('[data-open]')?.remove();
  $('[data-hint]')?.remove();
  const reveal = $('[data-reveal]');
  if (reveal) {
    reveal.hidden = false;
    reveal.classList.add('is-visible');
    const link = reveal.querySelector('a');
    // keep keyboard users on the page's one action, unless they are already elsewhere
    if (link && (!focused || focused === document.body || !focused.isConnected || !wasReady)) link.focus({ preventScroll: true });
  }
  listeners.splice(0).forEach((fn) => {
    try {
      fn(reason);
    } catch {
      /* the link is already shown */
    }
  });
}

export const onFallback = (fn) => {
  if (mode === 'fallback') fn(window.__juhuliaFallback);
  else listeners.push(fn);
};

// The scene calls this once it is built and warmed up. Returns false if it is too late.
export function ready() {
  if (mode !== 'loading') return mode === 'ready';
  mode = 'ready';
  clearTimeout(watch);
  clearTimeout(giveUp);
  window.__juhuliaReady = true;
  return true;
}

const alive = () => {
  if (mode !== 'loading' || fetched) return;
  clearTimeout(watch);
  watch = setTimeout(() => fallback('timeout'), STALL);
};

function progress(p) {
  const loader = $('[data-loader]');
  if (!loader || mode === 'fallback') return;
  const v = Math.round(Math.max(0, Math.min(1, p)) * 100);
  const bar = loader.querySelector('.loader__bar');
  if (bar) bar.style.strokeDashoffset = 100 - v;
  loader.setAttribute('aria-valuenow', v);
  alive();
}

function stars(loader) {
  // glitter on the loading screen, like the studio's
  const sky = document.createDocumentFragment();
  for (let i = 0; i < 70; i++) {
    const star = document.createElement('span');
    star.className = 'loader__star';
    star.setAttribute('aria-hidden', 'true');
    const big = Math.random() < 0.15;
    star.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 72}%;--d:${(2 + Math.random() * 3).toFixed(2)}s;--delay:${(-Math.random() * 4).toFixed(2)}s;--o:${(0.4 + Math.random() * 0.6).toFixed(2)};${big ? 'width:4px;height:4px;' : ''}`;
    sky.appendChild(star);
  }
  loader.prepend(sky);
}

async function fetchAll(files) {
  const got = files.map(() => 0);
  const total = () => files.reduce((a, f) => a + f[1], 0);
  const show = () => progress(0.78 * Math.min(1, got.reduce((a, b) => a + b, 0) / total()));
  await Promise.all(
    files.map(async ([url], i) => {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        const len = Number(res.headers.get('content-length'));
        if (len) files[i][1] = len;
        if (!res.body || !res.body.getReader) {
          await res.arrayBuffer();
        } else {
          const reader = res.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            got[i] += value.length;
            show();
          }
        }
      } catch {
        /* the import below fetches it again and fails there if it must */
      }
      got[i] = files[i][1];
      show();
    }),
  );
}

const script = (src) =>
  new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`missing ${src}`));
    document.head.appendChild(s);
  });

export async function boot(slug) {
  window.__juhuliaBoot = true;
  // the page's own guard gave up waiting for this module: stay with the link
  if (doc.dataset.state === 'fallback') return fallback('timeout');
  window.__juhuliaProgress = progress;
  doc.dataset.state = 'loading';
  const loader = $('[data-loader]');
  if (loader) {
    stars(loader);
    setTimeout(() => loader.querySelector('[data-loader-note]')?.classList.add('is-visible'), 3000);
  }
  alive();
  giveUp = setTimeout(() => fallback('timeout'), LIMIT);
  window.addEventListener('error', () => mode === 'loading' && fallback('error'));
  window.addEventListener('unhandledrejection', () => mode === 'loading' && fallback('error'));
  try {
    await fetchAll([
      ['/vendor/three.module.min.js', 670681],
      ['/vendor/gsap.min.js', 72214],
      ['/js/gacha.js', 64000],
      ['/js/gachas.js', 2600],
      ['/fonts/hanken.woff2', 34704],
    ]);
    if (isFallback()) return;
    await script('/vendor/gsap.min.js');
    if (isFallback()) return;
    const { start } = await import('/js/gacha.js');
    if (isFallback()) return;
    // everything is here; building and warming up the scene only answers to the overall limit
    fetched = true;
    clearTimeout(watch);
    await start(slug);
  } catch (err) {
    console.error(err);
    fallback(mode === 'ready' ? 'runtime' : 'init');
  }
}

const slug = $('[data-stage]')?.dataset.slug;
if (slug) boot(slug);
