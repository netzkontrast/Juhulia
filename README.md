# Juhulia

Drei Gacha-Kapseln mit QR-Code. Jeder Code führt zu einer eigenen Kapsel-Seite: eine Kapsel aus Rauchglas über Graphit in einem dunklen Fotostudio. Ein Tipp lässt sie aufplatzen, ein Objekt passend zum Geschenk springt heraus, und darunter erscheint der Link.

| Seite | Auftritt | Objekt | Link |
|---|---|---|---|
| [/zense](https://juhulia.vercel.app/zense) | fällt von oben, federt einmal schwer nach | Parfumflakon | zenseofficial.de |
| [/henne](https://juhulia.vercel.app/henne) | rollt aus der Tiefe des Studios heran | Weinglas, der Wein schwappt | henne-weinbar.de |
| [/phantasialand](https://juhulia.vercel.app/phantasialand) | wird im hohen Bogen hereinkatapultiert | goldenes Eintrittsticket | phantasialand.de |

Vor dem Tipp klopft es von innen, man ahnt das Objekt hinter dem Rauchglas, das Licht wandert über die Kapsel, und sie neigt sich zum Finger bzw. zur Neigung des Handys. Beim Öffnen: Zittern, Aufplatzen, der Deckel fliegt weg, das Objekt schießt mit Drall heraus, hängt kurz in Zeitlupe und schwebt dann vorn. Danach lässt es sich mit dem Finger drehen.

## Aufbau

Reines HTML, CSS und JavaScript, kein Build-Schritt. Vercel liefert `public/` aus (siehe `vercel.json`).

- `public/index.html`: die drei QR-Codes mit Links
- `public/<slug>.html`: die Kapsel-Seiten
- `public/js/gacha.js`: Studio, Kapsel, Objekte und Choreografie (Three.js + GSAP)
- `public/js/gachas.js`: Link, Auftritt und Objekt je Kapsel
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
