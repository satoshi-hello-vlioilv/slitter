/* 現物の画面キャプチャ(UI/UX 案の評価用)
 * ---------------------------------------------------------
 *   node tools/ui-capture/shot.js <出力の接頭辞> [幅x高 ...]
 *   環境変数:
 *     ROOT    … index.html のあるフォルダ(既定: リポジトリの根)
 *     INJECT  … 読み込み後に差し込む案のファイル(.js / .css を , 区切り)— 試作案をそのまま現物に被せる
 *     STEPS   … 撮る手順の JSON [{name, js?, wait?}](js はページ内で実行)
 *   CDN(cdnjs)は .vendor/ のローカル版へ差し替える(先に setup.sh)。
 *   各ショットで「UI が覆っている画面の割合」(3D のキャンバス・札以外が最前面の点の割合)を出す
 *   → メイン表示領域の客観値として評価表に書く。
 */
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const V = path.join(__dirname, '.vendor');
const ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '..', '..'));
(async () => {
  const out = process.argv[2] || 'shot';
  const sizes = (process.argv.length > 3 ? process.argv.slice(3) : ['1600x900', '390x844']).map(s => s.split('x').map(Number));
  const steps = process.env.STEPS ? JSON.parse(process.env.STEPS) : [{ name: 'default', wait: 2500 }];
  const inject = (process.env.INJECT || '').split(',').filter(Boolean).map(f => path.resolve(f));
  const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 700, isMobile: w < 700 });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERROR', e.message));
    page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
    await page.route('https://cdnjs.cloudflare.com/**', async r => {
      const u = r.request().url();
      if (u.includes('three.min.js')) return r.fulfill({ path: path.join(V, 'three/package/build/three.min.js'), contentType: 'application/javascript' });
      const m = u.match(/font-awesome\/6\.4\.0\/(.*)$/);
      if (m) return r.fulfill({ path: path.join(V, 'fa/package', m[1]) });
      return r.abort();
    });
    page.setDefaultTimeout(180000);
    await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'load', timeout: 180000 });
    for (const f of inject) {
      if (f.endsWith('.css')) await page.addStyleTag({ path: f }); else await page.addScriptTag({ path: f });
    }
    for (const s of steps) {
      if (s.js) await page.evaluate(s.js);
      await page.waitForTimeout(s.wait || 1200);
      const file = `${out}-${s.name}-${w}x${h}.png`;
      await page.screenshot({ path: file });
      const cover = await page.evaluate(() => {      // UI が 3D を覆っている割合(24px 格子)
        let n = 0, k = 0; const c = document.querySelector('#scene canvas');
        for (let y = 12; y < innerHeight; y += 24) for (let x = 12; x < innerWidth; x += 24) {
          n++; const e = document.elementFromPoint(x, y); if (e && e !== c && !e.closest('#labels')) k++; }
        return (k / n * 100).toFixed(1);
      });
      console.log(`saved ${file}  ui-cover=${cover}%`);
    }
    await ctx.close();
  }
  await browser.close();
})();
