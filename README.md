# Juhulia

Drei Gacha-Kapseln mit QR-Code. Jeder Code führt zu einer eigenen Kapsel-Seite: eine durchscheinende Kapsel in ihrer Farbe (Bernstein, Rosa, Grün), in einem Studio, das dunkel in derselben Farbe getönt ist, mit Glitzer in der Luft. Ein Tipp lässt sie aufplatzen, ein Objekt passend zum Geschenk springt heraus, und darunter erscheint „Hier geht’s hin“.

| Seite | Farbe | Auftritt | Objekt | Link |
|---|---|---|---|---|
| [/zense](https://juhulia.vercel.app/zense) | Bernstein | fällt von oben, federt einmal schwer nach | Parfumflakon, sprüht ab und zu Glitzer | zenseofficial.de |
| [/henne](https://juhulia.vercel.app/henne) | Rosa | rollt aus der Tiefe des Studios heran | Weinglas, schwenkt, der Wein schwappt | henne-weinbar.de |
| [/phantasialand](https://juhulia.vercel.app/phantasialand) | Grün | wird im hohen Bogen hereinkatapultiert | Achterbahn, der Wagen fährt Looping | phantasialand.de |

Vor dem Tipp klopft es von innen, man sieht das Objekt durch das farbige Plastik, das Licht wandert, die Kapsel wirft farbiges Licht auf den Boden, Glitzer funkelt, und sie neigt sich zum Finger. Beim Öffnen: Zittern, Aufplatzen, Glitzer wirbelt heraus, der Deckel fliegt weg, das Objekt schießt mit Drall heraus, hängt kurz in Zeitlupe und schwebt dann vorn. Danach lässt es sich mit dem Finger drehen; Antippen lässt es springen und funkeln. Es werden keine Geräte-Rechte (Bewegungssensoren) abgefragt.

## Aufbau

Reines HTML, CSS und JavaScript, kein Build-Schritt. Vercel liefert `public/` aus (siehe `vercel.json`).

- `public/index.html`: die drei QR-Codes mit Links
- `public/<slug>.html`: die Kapsel-Seiten
- `public/js/gacha.js`: Studio, Kapsel, Objekte und Choreografie (Three.js + GSAP)
- `public/js/gachas.js`: Link, Auftritt, Objekt und Farben je Kapsel
- `public/qr/<slug>.svg`: druckfertige QR-Codes für `https://juhulia.vercel.app/<slug>`
- `public/vendor/`: Three.js 0.160.1 und GSAP 3.12.5; `public/fonts/`: Hanken Grotesk

Falls die Szene nicht startet (kein WebGL, Skript lädt nicht), zeigt die Seite nach spätestens 8 Sekunden direkt den Link.

## Befehle

```bash
npm install     # nur für die Werkzeuge
npm run qr      # QR-Codes neu erzeugen
npm run vendor  # Three.js und GSAP nach public/vendor kopieren
npm run serve   # lokal ansehen auf http://localhost:3123
```

Mit `?debug` an der URL ist der Szenen-Zustand als `window.__juhulia` erreichbar (für automatische Tests).
