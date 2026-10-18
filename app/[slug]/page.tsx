import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GachaStage from '@/components/GachaStage';
import { gachas, getGacha } from '@/lib/gachas';

export const dynamicParams = false;

export function generateStaticParams() {
  return gachas.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGacha((await params).slug);
  return { title: g ? `Kapsel · ${g.name}` : 'Kapsel' };
}

export default async function GachaPage({ params }: Props) {
  const gacha = getGacha((await params).slug);
  if (!gacha) notFound();
  return <GachaStage gacha={gacha} />;
}
