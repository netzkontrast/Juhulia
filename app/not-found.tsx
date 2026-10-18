import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, textAlign: 'center' }}>
      <div>
        <p style={{ margin: 0, fontSize: 17 }}>Diese Kapsel gibt es nicht.</p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--muted)' }}>
          Prüfe den QR-Code oder <Link href="/">sieh alle Kapseln an</Link>.
        </p>
      </div>
    </main>
  );
}
