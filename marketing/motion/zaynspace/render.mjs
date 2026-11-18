// Exporte zaynspace-promo.html en MP4.
//
//   node marketing/motion/zaynspace/render.mjs [--fps 30] [--mute] [sortie.mp4]
//       vertical 1080×1920, H.264 30 i/s + musique AAC à -14 LUFS
//       (TikTok, Instagram Reels, YouTube Shorts, LinkedIn)
//   node marketing/motion/zaynspace/render.mjs --land [sortie.mp4]
//       démo 16:9 1920×1080 en boucle, sans son, pour la page d'accueil
//
// Nécessite Playwright (paquet playwright ou playwright-core + Chromium), ffmpeg
// et python3 avec numpy (musique : music.py). Chromium ailleurs que là où
// Playwright l'attend : CHROMIUM_PATH=/chemin/vers/chrome.
// Polices : Geist, lue dans node_modules/geist (dépendance de l'application).
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const { chromium } = await import("playwright").catch(() => import("playwright-core"));

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opts = { fps: 30, mute: false, land: false, out: null };
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mute") opts.mute = true;
  else if (args[i] === "--land") { opts.land = true; opts.mute = true; }
  else if (args[i] === "--fps") opts.fps = Number(args[++i]);
  else opts.out = path.resolve(args[i]);
}
opts.out ??= path.join(here, opts.land ? "zaynspace-demo-16x9.mp4" : "zaynspace-promo.mp4");
const [W, H] = opts.land ? [1920, 1080] : [1080, 1920];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "zaynspace-promo.html")).href + (opts.land ? "?record=1&land=1" : "?record=1"), { waitUntil: "load" });
await page.waitForFunction(() => window.__ready === true);
const fonts = await page.evaluate(async () => {
  await Promise.all(["500 40px Geist", "600 40px Geist", "700 40px Geist", "600 40px 'Geist Mono'"].map((f) => document.fonts.load(f)));
  return document.fonts.check("600 40px Geist");
});
if (!fonts) throw new Error("Police Geist introuvable : lancez `npm install` à la racine (paquet geist).");

const duration = await page.evaluate(() => window.__duration);
const work = mkdtempSync(path.join(tmpdir(), "zaynspace-"));
const audio = [];
if (!opts.mute) {
  // bande-son calée sur les repères de l'animation
  const cues = path.join(work, "cues.json"), wav = path.join(work, "music.wav");
  writeFileSync(cues, JSON.stringify(await page.evaluate(() => window.__cues)));
  execFileSync("python3", ["-I", path.join(here, "music.py"), cues, wav], { stdio: "inherit" });
  audio.push("-i", wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-shortest");
}

// écrit sous un nom provisoire, renommé seulement si ffmpeg réussit
const tmpOut = opts.out.replace(/\.mp4$/, ".partiel.mp4");
const frames = Math.round(duration * opts.fps);
const ffmpeg = spawn("ffmpeg", [
  "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(opts.fps), "-c:v", "mjpeg", "-i", "-",
  ...audio,
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", tmpOut,
], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((r) => ffmpeg.on("close", r));

for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__seek(t), i / opts.fps);
  const jpg = await page.screenshot({ type: "jpeg", quality: 92, clip: { x: 0, y: 0, width: W, height: H } });
  if (!ffmpeg.stdin.write(jpg)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  if (i % (opts.fps * 5) === 0) process.stdout.write(`\r${Math.round((i / frames) * 100)} %`);
}
ffmpeg.stdin.end();
const code = await done;
await browser.close();
rmSync(work, { recursive: true, force: true });
if (code !== 0) throw new Error(`ffmpeg a échoué (code ${code})`);
renameSync(tmpOut, opts.out);
console.log(`\n→ ${opts.out}`);
