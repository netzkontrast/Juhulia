# Juhulia

Gacha-Kapseln mit QR-Code. Jeder Code öffnet eine eigene Seite mit einer 3D-Kapsel auf Schwarz. Ein Tipp öffnet sie, danach geht es weiter zum jeweiligen Ziel.

| Seite | Öffnung | Ziel |
|---|---|---|
| `/zense` | Deckel dreht sich ab, Duftnebel steigt auf | https://zenseofficial.de/ |
| `/henne` | Deckel klappt nach hinten auf, Wein im Kerzenlicht | https://henne-weinbar.de/ |
| `/phantasialand` | Kapsel steigt in kreisenden Lichtringen auf | https://www.phantasialand.de/de/ |

- `/` zeigt alle drei QR-Codes mit Links zu den Kapsel-Seiten.
- `/qr/<slug>` lädt den QR-Code als SVG herunter (für den Druck).
- Ziele, Farben und Öffnungsart stehen in `lib/gachas.ts`.

Die QR-Codes zeigen automatisch auf die Domain, unter der die Seite läuft. Für den Druck sollte eine feste Domain gesetzt sein: `NEXT_PUBLIC_SITE_URL=https://deine-domain.vercel.app` in den Vercel-Umgebungsvariablen. So ändern sich die gedruckten Codes nicht, wenn sich die Vorschau-URL ändert.

## Entwickeln

```bash
npm install
npm run dev
```

## Auf Vercel veröffentlichen

1. Auf vercel.com → **Add New… → Project** → das GitHub-Repo `netzkontrast/Juhulia` importieren.
2. Framework wird als Next.js erkannt; keine weiteren Einstellungen nötig.
3. Nach dem ersten Deploy die Produktions-Domain als `NEXT_PUBLIC_SITE_URL` eintragen und neu deployen.
4. QR-Codes über `/` bzw. `/qr/<slug>` herunterladen und drucken.
