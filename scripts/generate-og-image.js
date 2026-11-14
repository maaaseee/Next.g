import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const htmlPath = resolve(process.cwd(), 'tools', 'og-card-builder.html');
const outputPath = resolve(process.cwd(), 'public', 'og-image.png');
const fileUrl = pathToFileURL(htmlPath).href;

console.log('🖼️  Generando OpenGraph preview image (1200x630)...');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'google-chrome',
  'chromium',
  'edge',
];

const browserBinary = candidates.find((bin) => existsSync(bin));

if (!browserBinary) {
  console.error('❌ No se encontró ningún ejecutable de Chromium / Edge / Chrome.');
  process.exit(1);
}

try {
  const cmd = `"${browserBinary}" --headless=new --disable-gpu --force-device-scale-factor=1 --window-size=1200,630 --hide-scrollbars --screenshot="${outputPath}" "${fileUrl}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ ¡Imagen generada con éxito!\n📁 Guardada en: ${outputPath}`);
} catch (error) {
  console.error('❌ Error al generar la imagen:', error);
  process.exit(1);
}
