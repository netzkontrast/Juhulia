// Writes one print-ready QR code per capsule page to public/qr/<slug>.svg.
import QRCode from 'qrcode';
import { writeFile, mkdir } from 'node:fs/promises';
import { GACHAS, SITE } from '../public/js/gachas.js';

await mkdir(new URL('../public/qr/', import.meta.url), { recursive: true });
const CARD = { zense: '#f6e8cc', henne: '#f8e4e8', phantasialand: '#dcf0e3' };
for (const slug of Object.keys(GACHAS)) {
  const svg = await QRCode.toString(`${SITE}/${slug}`, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 4,
    color: { dark: '#111214', light: CARD[slug] ?? '#e9e7e3' },
  });
  await writeFile(new URL(`../public/qr/${slug}.svg`, import.meta.url), svg);
  console.log(`${SITE}/${slug} -> public/qr/${slug}.svg`);
}
