// Пререндер Lottie-анимации (JSON из .lottie) в прозрачный WebM VP9 — без
// новых зависимостей в проекте: кадр за кадром через Chromium и lottie-web.
//
//   node scripts/lottie-render.cjs <animation.json> <out.webm> [size=720] [fps=30]
//
// Зачем так: @remotion/lottie — новая зависимость, а пререндер даёт готовый
// файл, который кладётся в кадр через <OffthreadVideo transparent>. Исходники
// .lottie — zip, анимация лежит в animations/*.json (не manifest.json).
//
// puppeteer-core берётся из node_modules или из кэша npx; если его нет:
//   npx -y -p puppeteer-core@22 node scripts/lottie-render.cjs …
// lottie-web (lottie.min.js) при первом запуске скачивается с cdnjs в public/local/lottie/.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, execFileSync } = require("child_process");

const [, , jsonPath, outWebm, sizeArg, fpsArg] = process.argv;
if (!jsonPath || !outWebm) {
  console.error("использование: node scripts/lottie-render.cjs <animation.json> <out.webm> [size] [fps]");
  process.exit(1);
}
const size = Number(sizeArg || 720);
const fps = Number(fpsArg || 30);

const requirePuppeteer = () => {
  try {
    return require("puppeteer-core");
  } catch {
    const cache = path.join(os.homedir(), ".npm", "_npx");
    if (fs.existsSync(cache)) {
      for (const d of fs.readdirSync(cache)) {
        const p = path.join(cache, d, "node_modules", "puppeteer-core");
        if (fs.existsSync(p)) return require(p);
      }
    }
    throw new Error("нет puppeteer-core: запустите через `npx -y -p puppeteer-core@22 node scripts/lottie-render.cjs …`");
  }
};

const findChrome = () => {
  const candidates = [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH].filter(Boolean);
  const pw = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  if (fs.existsSync(pw)) {
    for (const d of fs.readdirSync(pw)) {
      if (d.startsWith("chromium")) candidates.push(path.join(pw, d, "chrome-linux", "chrome"));
    }
  }
  for (const bin of ["google-chrome", "chromium", "chromium-browser"]) {
    try {
      candidates.push(execFileSync("which", [bin], { encoding: "utf8" }).trim());
    } catch {
      /* нет такого */
    }
  }
  const found = candidates.find((c) => c && fs.existsSync(c));
  if (!found) throw new Error("не найден Chromium: укажите CHROME_PATH");
  return found;
};

const lottieLib = () => {
  const dir = path.resolve(__dirname, "..", "public", "local", "lottie");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "lottie.min.js");
  if (!fs.existsSync(file)) {
    execFileSync("curl", ["-sSL", "--max-time", "60", "-o", file, "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"], { stdio: "inherit" });
  }
  return fs.readFileSync(file, "utf8");
};

(async () => {
  const puppeteer = requirePuppeteer();
  const anim = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const lib = lottieLib();
  const browser = await puppeteer.launch({ executablePath: findChrome(), args: ["--no-sandbox"], headless: true, defaultViewport: { width: size, height: size } });
  const page = await browser.newPage();
  await page.setContent(`<html><body style="margin:0;background:transparent"><div id="a" style="width:${size}px;height:${size}px"></div></body></html>`);
  await page.addScriptTag({ content: lib });
  const total = await page.evaluate((data) => {
    window.anim = lottie.loadAnimation({ container: document.getElementById("a"), renderer: "svg", loop: false, autoplay: false, animationData: data });
    return window.anim.totalFrames;
  }, anim);
  const srcFps = anim.fr || 30;
  const seconds = total / srcFps;
  const frames = Math.round(seconds * fps);
  const dir = outWebm + ".frames";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < frames; i++) {
    await page.evaluate((f) => window.anim.goToAndStop(f, true), (i / fps) * srcFps);
    await page.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.png`, omitBackground: true });
  }
  await browser.close();
  execSync(`ffmpeg -v error -y -framerate ${fps} -i "${dir}/%04d.png" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 24 -auto-alt-ref 0 "${outWebm}"`);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`✔ ${outWebm}: ${frames} кадров, ${seconds.toFixed(2)} с`);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
