import Link from 'next/link';
import { gachas, hostOf } from '@/lib/gachas';
import { qrSvg, siteOrigin } from '@/lib/qr';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const origin = await siteOrigin();
  const codes = await Promise.all(
    gachas.map(async (g) => ({ ...g, target: `${origin}/${g.slug}`, svg: await qrSvg(`${origin}/${g.slug}`) })),
  );

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Juhulia</h1>
        <p className={styles.lede}>Jeder Code öffnet eine Kapsel.</p>
      </header>

      <ul className={styles.grid}>
        {codes.map((g) => (
          <li key={g.slug} className={styles.item}>
            <Link href={`/${g.slug}`} className={styles.code} aria-label={`Kapsel ${g.name} öffnen`}>
              <span className={styles.qr} dangerouslySetInnerHTML={{ __html: g.svg }} />
            </Link>
            <div className={styles.meta}>
              <h2 className={styles.name}>{g.name}</h2>
              <p className={styles.host}>{hostOf(g.url)}</p>
            </div>
            <div className={styles.actions}>
              <Link href={`/${g.slug}`} className={styles.action}>
                Kapsel öffnen
              </Link>
              <a href={`/qr/${g.slug}`} className={styles.action} download={`qr-${g.slug}.svg`}>
                QR als SVG
              </a>
            </div>
            <p className={styles.target}>{g.target.replace(/^https?:\/\//, '')}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
