import { getGacha } from '@/lib/gachas';
import { qrSvg, siteOrigin } from '@/lib/qr';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gacha = getGacha(slug);
  if (!gacha) return new Response('Not found', { status: 404 });
  const svg = await qrSvg(`${await siteOrigin()}/${gacha.slug}`);
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="qr-${gacha.slug}.svg"`,
      'Cache-Control': 'no-store',
    },
  });
}
