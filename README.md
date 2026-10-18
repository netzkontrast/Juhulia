# Juhulia

Drei Gacha-Kapseln im Gruftie-Stil. Jeder QR-Code führt zu einer eigenen Kapsel-Seite: Die Kapsel erscheint in einer dunklen Krypta mit Kerzen, Bodennebel und gotischen Fenstern. Ein Tipp öffnet sie, danach geht es weiter zum Ziel.

| Seite | Auftritt | Öffnung | Ziel |
|---|---|---|---|
| [/zense](https://juhulia.vercel.app/zense) | fällt von oben und hüpft aus | Deckel dreht sich ab, Weihrauch steigt auf | https://zenseofficial.de/ |
| [/henne](https://juhulia.vercel.app/henne) | gleitet aus der Ferne durch den Nebel heran, Kerzen entzünden sich | Deckel klappt wie ein Reliquiar auf, Wein im Kerzenlicht | https://henne-weinbar.de/ |
| [/phantasialand](https://juhulia.vercel.app/phantasialand) | Blitz, dann steigt sie aus einem Lichtring im Boden | schwebt in kreisenden Ringen, Fledermäuse fliehen | https://www.phantasialand.de/de/ |

Solange niemand tippt, flackern die Kerzen, Asche treibt im Licht, Zugluft lässt die Flammen sich neigen, die Naht pulsiert wie ein Herzschlag. Bei Phantasialand blitzt es ab und zu und Fledermäuse ziehen vor dem Mond vorbei, bei zense steigt ein Faden Weihrauch auf.

## Aufbau

Reines HTML, CSS und JavaScript, kein Build-Schritt. Vercel liefert den Ordner `public/` aus (siehe `vercel.json`).

- `public/index.html`: alle drei QR-Codes mit Links
- `public/<slug>.html`: die Kapsel-Seiten
- `public/js/gacha.js`: die 3D-Szene (Three.js) und die Choreografie (GSAP)
- `public/js/gachas.js`: Ziele, Farben, Auftritt und Öffnung je Kapsel
- `public/qr/<slug>.svg`: druckfertige QR-Codes für `https://juhulia.vercel.app/<slug>`
- `public/vendor/`: Three.js 0.160.1 und GSAP 3.12.5, lokal mitgeliefert

## Befehle

```bash
npm install     # nur für die Werkzeuge unten
npm run qr      # QR-Codes neu erzeugen (nach Änderungen an SITE oder den Slugs)
npm run vendor  # Three.js und GSAP nach public/vendor kopieren
npm run serve   # lokal ansehen auf http://localhost:3123
```
