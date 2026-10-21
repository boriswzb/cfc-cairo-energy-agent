import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'data', 'cairo_hourly.csv');
const targetDir = path.join(root, 'apps', 'web', 'public', 'data');
const target = path.join(targetDir, 'cairo_hourly.csv');
const metaSource = path.join(root, 'data', 'weather-metadata.json');
const metaTarget = path.join(targetDir, 'weather-metadata.json');

if (!fs.existsSync(source)) {
  throw new Error('Run `npm run weather:prepare` first; data/cairo_hourly.csv is missing.');
}
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
fs.copyFileSync(metaSource, metaTarget);
console.log(`Synced weather CSV to ${path.relative(root, target)}`);
