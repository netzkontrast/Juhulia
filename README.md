# Juhulia

Drei Gacha-Kapseln mit QR-Code. Jeder Code führt zu einer eigenen Kapsel-Seite: eine durchscheinende Kapsel in ihrer Farbe (Bernstein, Rosa, Grün), in einem Studio, das dunkel in derselben Farbe getönt ist, mit Glitzer in der Luft. Ein Tipp lässt sie aufplatzen, ein Objekt passend zum Geschenk springt heraus, und darunter erscheint „Hier geht’s hin“.

| Seite | Farbe | Auftritt | Objekt | Link |
|---|---|---|---|---|
| [/zense](https://juhulia.vercel.app/zense) | Bernstein | fällt von oben, federt einmal schwer nach | Parfumflakon, der Duft schwappt, sprüht ab und zu Glitzer | zenseofficial.de |
| [/henne](https://juhulia.vercel.app/henne) | Rosa | rollt aus der Tiefe des Studios heran | Weinglas, schwenkt, der Wein schwappt nach | henne-weinbar.de |
| [/phantasialand](https://juhulia.vercel.app/phantasialand) | Grün | wird im hohen Bogen hereinkatapultiert | Karussell, dreht sich, die Pferde wippen | phantasialand.de |

Vor dem Tipp klopft es von innen, man ahnt das Objekt als Schatten hinter dem milchigen Plastik, ein Suchscheinwerfer streift umher, das Licht wandert, die Kapsel wirft farbiges Licht auf den Boden, Glitzer funkelt, und sie neigt sich zum Finger. Beim Öffnen: Zittern, Aufplatzen, Glitzer wirbelt heraus, der Deckel fliegt weg, das Objekt schießt mit Drall heraus, hängt kurz in Zeitlupe und schwebt dann vorn. Danach lässt es sich mit dem Finger drehen; Antippen lässt es springen und funkeln. Dreimal schnell antippen weckt ein Easter Egg: zense sprüht eine Duftwolke rundherum, der Wein von Henne. beginnt zu perlen, das Karussell dreht voll auf und schießt ein kleines Feuerwerk vom Dach. Es werden keine Geräte-Rechte (Bewegungssensoren) abgefragt.

## Aufbau

Reines HTML, CSS und JavaScript, kein Build-Schritt. Vercel liefert `public/` aus (siehe `vercel.json`).

- `public/index.html`: die drei QR-Codes mit Links
- `public/<slug>.html`: die Kapsel-Seiten
- `public/js/boot.js`: Laden mit Fortschritt, Bereitschaft und Ersatzansicht (ohne 3D-Engine)
- `public/js/gacha.js`: Studio, Kapsel, Objekte und Choreografie (Three.js + GSAP)
- `public/js/gachas.js`: Link, Auftritt, Objekt, Objektname und Farben je Kapsel
- `tests/pages.test.mjs`: Tests der Fehlerwege, der Tastatur und der ruhigen Variante
- `public/qr/<slug>.svg`: druckfertige QR-Codes für `https://juhulia.vercel.app/<slug>`
- `public/vendor/`: Three.js 0.160.1 und GSAP 3.12.5; `public/fonts/`: Hanken Grotesk

Beim Laden zeigt ein Ring den echten Fortschritt (Download aller Dateien, dann Shader kompilieren, Schrift, zwei Aufwärm-Bilder). Erst wenn alles bereit ist, blendet er aus und die Kapsel tritt auf.

Der Link ist immer erreichbar. `public/js/boot.js` lädt die Szene und wechselt bei jedem Fehler genau einmal in die Ersatzansicht: Name und „Hier geht’s hin“ auf der Farbe der Seite. Auslöser sind eine fehlende Datei, kein WebGL, ein Fehler beim Aufbau oder Rendern, ein verlorener GPU-Kontext oder 10 Sekunden ohne Download-Fortschritt (insgesamt höchstens 45 Sekunden). Ein verspäteter Szenenstart ändert danach nichts mehr. Ohne JavaScript zeigt die Seite dieselbe Ansicht. Fehlt `boot.js` selbst, greift ein kleiner Wächter in der Seite nach 15 Sekunden.

Bei „Bewegung reduzieren“ steht die Kapsel still: kein Auftritt, kein Klopfen, kein wanderndes Licht. Ein Tipp (oder Enter/Leertaste) öffnet sie ohne Flug, Wackeln und Feuerwerk, das Objekt steht ruhig, der Link erscheint sofort. Ändert sich die Einstellung, während die Seite offen ist, gilt sie ab sofort. Beim Öffnen meldet die Seite das Objekt für Screenreader („Kapsel geöffnet: Parfumflakon.“), und der Fokus geht auf den Link.

## Befehle

```bash
npm install     # nur für die Werkzeuge
npm run qr      # QR-Codes neu erzeugen
npm run vendor  # Three.js und GSAP nach public/vendor kopieren
npm run serve   # lokal ansehen auf http://localhost:3123
npm test        # Fehlerwege und Tastatur prüfen (Chromium; Pfad über CHROMIUM_PATH)
```

Mit `?debug` an der URL ist der Szenen-Zustand als `window.__juhulia` erreichbar (für automatische Tests).
