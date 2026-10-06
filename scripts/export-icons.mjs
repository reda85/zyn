import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const icons = ["zap", "droplets", "paint-roller", "fire-extinguisher", "grid", "calendar-days", "check", "user", "user-circle", "check-check", "map-pin", "map","wifi","flame","trending-up","trending-down","construction","door-open","droplet-off","brush-cleaning","brick-wall","package","check-circle","alarm-smoke","air-vent","folder"];

const colors = {
  white: "#FFFFFF",
  black: "#000000",
  stone: "#1c1917", // stone-800
};

const srcDir = path.join(__dirname, "../node_modules/lucide-static/icons");
const outDir = path.join(__dirname, "../public/icons");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

async function convert() {
  for (const icon of icons) {
    const svgPath = path.join(srcDir, `${icon}.svg`);
    let svg = fs.readFileSync(svgPath, "utf-8");

    for (const [name, hex] of Object.entries(colors)) {
      // Replace any existing stroke with our hex color
      const coloredSvg = svg.replace(/stroke=".*?"/g, `stroke="${hex}"`);

      const pngPath = path.join(outDir, `${icon}-${name}.png`);

      await sharp(Buffer.from(coloredSvg))
        .resize(48, 48) // size in px
        .png()
        .toFile(pngPath);

      console.log(`✅ Exported ${icon}-${name}.png`);
    }
  }
}

convert();
