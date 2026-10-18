// Regression tests for the capsule pages: every way the scene can fail still ends on the
// page's own link, and the keyboard / reduced-motion path works end to end.
// Run: npm test (needs a Chromium; set CHROMIUM_PATH if it is not at /opt/pw-browsers/chromium).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { GACHAS } from '../public/js/gachas.js';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const SLUGS = Object.keys(GACHAS);

let server;
let base;
let browser;

before(async () => {
  server = http.createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try {
      const body = await readFile(join(ROOT, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'content-length': body.length });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(slug, { js = true, block = [], delay = {}, init, motion = 'no-preference', query = '' } = {}) {
  const context = await browser.newContext({ javaScriptEnabled: js, reducedMotion: motion, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const path of block) await page.route(`**${path}`, (r) => r.fulfill({ status: 404, body: '' }));
  for (const [path, ms] of Object.entries(delay)) {
    await page.route(`**${path}`, async (r) => {
      await new Promise((t) => setTimeout(t, ms));
      await r.continue().catch(() => {});
    });
  }
  if (init) await page.addInitScript(init);
  await page.goto(`${base}/${slug}.html${query}`);
  return { page, errors, close: () => context.close() };
}

// The link is shown, points to the capsule's destination, and nothing covers it.
async function assertLink(page, slug, { timeout = 30000 } = {}) {
  const link = page.locator('[data-reveal] a');
  await link.waitFor({ state: 'visible', timeout });
  await page.waitForFunction(() => {
    const a = document.querySelector('[data-reveal] a');
    const r = a.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return a.contains(hit) && getComputedStyle(a.parentElement).opacity === '1';
  }, null, { timeout: 5000 });
  assert.equal(await link.getAttribute('href'), GACHAS[slug].url);
  const box = await link.boundingBox();
  assert.ok(box.width >= 44 && box.height >= 44, 'touch target at least 44 × 44');
  assert.equal(await page.locator('[data-open]:visible').count(), 0, 'no open button left');
  assert.equal(await page.locator('[data-loader]:visible').count(), 0, 'no loading screen left');
}

const each = (name, fn) => test(name, () => Promise.all(SLUGS.map((slug) => fn(slug))));

each('without JavaScript the link is there', async (slug) => {
  const { page, close } = await open(slug, { js: false });
  await assertLink(page, slug);
  await close();
});

each('missing three.js falls back to the link', async (slug) => {
  const { page, close } = await open(slug, { block: ['/vendor/three.module.min.js'] });
  await assertLink(page, slug);
  assert.equal(await page.evaluate(() => window.__juhuliaFallback), 'init');
  await close();
});

each('missing GSAP falls back to the link', async (slug) => {
  const { page, close } = await open(slug, { block: ['/vendor/gsap.min.js'] });
  await assertLink(page, slug);
  await close();
});

each('missing boot module falls back to the link', async (slug) => {
  const { page, close } = await open(slug, { block: ['/js/boot.js'] });
  await assertLink(page, slug);
  await close();
});

each('without WebGL the link is there', async (slug) => {
  const { page, close } = await open(slug, {
    init: () => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/.test(type) ? null : get.call(this, type, ...rest);
      };
    },
  });
  await assertLink(page, slug);
  assert.equal(await page.evaluate(() => window.__juhuliaFallback), 'webgl');
  await close();
});

each('an error after the renderer exists falls back to the link', async (slug) => {
  const { page, close } = await open(slug, {
    init: () => {
      for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        C.prototype.drawElements = () => {
          throw new Error('draw failed');
        };
      }
    },
  });
  await assertLink(page, slug, { timeout: 60000 });
  assert.ok(['render', 'init'].includes(await page.evaluate(() => window.__juhuliaFallback)));
  assert.notEqual(await page.evaluate(() => window.__juhuliaReady), true);
  await close();
});

each('a stalled start falls back, and its late arrival changes nothing', async (slug) => {
  const { page, errors, close } = await open(slug, { delay: { '/js/gacha.js': 16000 } });
  await assertLink(page, slug, { timeout: 15000 });
  assert.equal(await page.evaluate(() => window.__juhuliaFallback), 'timeout');
  // the scene module arrives late and may start; the page must stay as it is
  await page.waitForTimeout(30000);
  await assertLink(page, slug);
  assert.notEqual(await page.evaluate(() => window.__juhuliaReady), true);
  assert.deepEqual(errors, []);
  await close();
});

each('losing the GPU context falls back to the link', async (slug) => {
  const { page, errors, close } = await open(slug, { query: '?debug' });
  await page.waitForFunction(() => window.__juhuliaReady, null, { timeout: 120000 });
  await page.evaluate(() => window.__juhulia.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  await assertLink(page, slug);
  assert.equal(await page.evaluate(() => window.__juhuliaFallback), 'context-lost');
  // a second and third fallback are harmless
  await page.evaluate(async () => {
    const { fallback } = await import('/js/boot.js');
    fallback('again');
    fallback('again');
  });
  assert.equal(await page.evaluate(() => window.__juhuliaFallback), 'context-lost');
  assert.equal(await page.locator('[data-reveal] a').count(), 1);
  assert.deepEqual(errors, []);
  await close();
});

each('reduced motion: keyboard opens, a still reveal, focus on the link', async (slug) => {
  const { page, errors, close } = await open(slug, { motion: 'reduce', query: '?debug' });
  await page.waitForFunction(() => window.__juhulia?.state.mode === 'idle', null, { timeout: 120000 });
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.open), '');
  await page.keyboard.press('Enter');
  // no flight: the gift is home and the link up straight away
  const s = await page.evaluate(() => ({ mode: __juhulia.state.mode, gift: __juhulia.giftPhys.mode }));
  assert.deepEqual(s, { mode: 'revealed', gift: 'home' });
  await assertLink(page, slug, { timeout: 10000 });
  await page.waitForFunction(() => document.activeElement?.matches('[data-reveal] a'), null, { timeout: 5000 });
  // the gift stands still: same pose a moment later
  const pose = () => page.evaluate(() => __juhulia.gift.root.position.toArray().concat(__juhulia.gift.root.rotation.y).map((v) => v.toFixed(3)).join());
  const p1 = await pose();
  await page.waitForTimeout(3000);
  assert.equal(await pose(), p1);
  assert.deepEqual(errors, []);
  await close();
});

test('normal motion: Space opens and the link takes the focus', async () => {
  const slug = 'zense';
  const { page, errors, close } = await open(slug, { query: '?debug' });
  await page.waitForFunction(() => window.__juhulia?.state.mode === 'idle', null, { timeout: 180000 });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__juhulia.state.mode === 'revealed', null, { timeout: 240000 });
  await assertLink(page, slug);
  await page.waitForFunction(() => document.activeElement?.matches('[data-reveal] a'), null, { timeout: 5000 });
  assert.deepEqual(errors, []);
  await close();
});
