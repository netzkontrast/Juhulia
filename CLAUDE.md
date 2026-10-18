# Juhulia — Arbeitsanweisungen für Claude

## Zuerst lesen

Lies `PRODUCT.md`, `README.md`, `public/js/gachas.js` und die betroffenen Teile von `public/js/gacha.js`. Prüfe den aktuellen Branch, bevor du eine Idee umsetzt: Bereits vorhandenes Verhalten gilt nicht als neue Funktion.

Diese Datei ergänzt die Produktvorgaben um einen priorisierten Vorschlagskatalog. Sie beauftragt keine automatische Komplettumsetzung. Bei einem offenen Weiterentwicklungsauftrag zunächst P0 abschließen, danach eine kleine, zusammenhängende P1-Erweiterung auswählen.

## Produkt und verbindliche Grenzen

- Ein QR-Scan führt zu genau einer Kapsel. Ein Tipp enthüllt das Geschenk; danach führt „Hier geht’s hin“ zur externen Website. Kein automatisches Weiterleiten.
- Farben erhalten: zense Bernstein, Henne. Rosa, Phantasialand Grün. Dunkles Studio derselben Farbfamilie, milchiges Plastik, Hanken Grotesk, physische Bewegung mit Gewicht. Keine zusätzliche Themenkulisse.
- Die Kapsel bleibt das zentrale Interface. Keine Sammlung, Gewinnwahrscheinlichkeiten, Punkte, Tagesbelohnungen oder konkurrierenden Inhaltsbereiche.
- Keine erfundenen Geschenkdetails, Gutscheincodes, Preise, Termine, Reservierungen oder Zusagen. Die Objekte sind Symbole; insbesondere ist das Karussell kein ausgestelltes Ticket.
- Keine Geräteberechtigungen, Tracker oder neue externen Laufzeitdienste. Persönliche Widmungen nur mit vom Autor gelieferten Texten und ausdrücklichem Auftrag; Repository und Seiten sind öffentlich erreichbar, `noindex` ist kein Zugriffsschutz.
- Statische HTML/CSS/JS-Seiten auf Vercel erhalten. Kein Framework und kein Build-System nur für diese Erweiterungen einführen.

## Verifizierter Ausgangspunkt

Quellcodeprüfung am 18.10.2026, Basis `5988a1e`. Dies ist keine visuelle Prüfung der laufenden Website.

- Bereits vorhanden: drei Auftritte, Schatten des Geschenks, Klopfen, Suchscheinwerfer, farbiges Bodenlicht, Glitzer, Zeitlupe, Flüssigkeitssimulation und lebendige Geschenkobjekte.
- Bereits vorhanden: Ziehen zum Drehen, Antippen zum Springen und Dreifachtipp für Duftwolke, Weinperlen beziehungsweise Karussell-Feuerwerk. Nicht erneut als neue Elemente implementieren.
- Bereits vorhanden: Ladefortschritt, WebGL-Konstruktor-Fallback, 15-Sekunden-Watchdog und ein Teil der Reduced-Motion-Behandlung. Die folgenden P0-Aufgaben schließen konkrete Lücken darin.
- Es gab bislang keine `CLAUDE.md` und keine `AGENTS.md` im Repository.
- Ältere Designnotizen sind teilweise überholt: Die Surface-Notiz nennt noch ein goldenes Ticket; aktueller Code, README und PRODUCT verwenden ein Karussell. Die ältere Kritik betrifft ausdrücklich eine ersetzte Gothic-Version. Bei Widersprüchen aktuelle Produktvorgaben und Implementierung abgleichen.

## P0 — Grundlage vor zusätzlichen Effekten

### 1. Verlässliche Enthüllung auch bei Fehlern

**Befund:** `start()` setzt `window.__juhuliaReady = true` unmittelbar nach dem Renderer-Konstruktor. Spätere Fehler oder ein hängendes Shader-Kompilieren entziehen sich dadurch dem HTML-Watchdog. Fehler beim dynamischen Import haben keinen unmittelbaren Catch-Pfad. Ohne JavaScript bleibt der Link verborgen. Ein später Szenenstart kann mit dem bereits ausgelösten Fallback kollidieren.

**Auftrag:** Einen gemeinsamen, idempotenten Übergang nach `fallback` schaffen. Bereitschaft erst nach erfolgreichem Szenenaufbau und Aufwärmen melden. Importfehler, Initialisierungsfehler, Zeitlimit und `webglcontextlost` führen zum erreichbaren Original-Link. Nach dem Fallback darf ein verspäteter Start keine entfernten Controls benutzen oder den Link verdecken. Den Link auch ohne JavaScript verfügbar machen, etwa per `noscript` außerhalb des versteckten Reveal-Containers. Gemeinsame Boot-/Fallback-Logik aus den drei HTML-Seiten in ein kleines Modul auslagern; der Notfallpfad darf nicht vom erfolgreichen Import der 3D-Engine abhängen.

**Abnahme:** Jede der drei Seiten zeigt ihren korrekten Link bei deaktiviertem JavaScript, fehlender GSAP-/Three-Datei, fehlendem WebGL, Fehler nach Renderer-Erzeugung, verzögerter Initialisierung und Kontextverlust. Kein blockierendes Overlay bleibt stehen. Mehrfacher Fallback und spätes Auflösen der Initialisierung sind unschädlich.

### 2. Ruhige und zugängliche Variante

**Befund:** Reduced Motion überspringt den Auftritt und Kamerastöße, lässt aber unter anderem Klopfen, Zittern, Partikel, Objektbewegung und Teile der Öffnungsphysik weiterlaufen. Der Öffnen-Button wird entfernt, ohne einen expliziten Fokusübergang. Canvas-Gesten besitzen keine gleichwertigen Tastaturaktionen.

**Auftrag:** Bei `prefers-reduced-motion` eine stabile Pose und eine kurze, ruhige Enthüllung ohne Flug, Shake, Feuerwerk oder dauerhaft wandernde Effekte verwenden. Änderungen der Einstellung berücksichtigen. Enthülltes Geschenk mit Namen im DOM und für Screenreader mitteilen. Tastaturöffnung per Enter/Leertaste prüfen; beim Entfernen des fokussierten Buttons den Fokus sinnvoll zum Ziel-Link übergeben. Neue Objektaktionen über zugängliche Controls anbieten; diese sekundär und erst nach der Enthüllung zeigen.

**Abnahme:** Öffnen und Link funktionieren vollständig mit Tastatur und Screenreader. Reduced Motion unterdrückt auch neu ergänzte Effekte. Fokus bleibt sichtbar; Touchziele mindestens 44 × 44 CSS-Pixel. Keine zusätzlichen Controls, solange nur die bestehende Enthüllung angeboten wird.

## P1 — Neue Elemente für die eigentliche Enthüllung

### 3. Lichtspalt an der Kapselnaht

Ein schmaler Lichtspalt wandert während der bestehenden Öffnung entlang der Naht, bevor sich der Deckel löst. Die Halterungen geben mit einem kurzen, gedämpften Nachfedern nach. Das erweitert die Materialwirkung statt einer weiteren Partikelebene.

**Integration:** `open()`, die Vorbereitungsphase im Frame-Loop und `burst()` in `gacha.js`; bestehende Rim-/Glow-Materialien zuerst wiederverwenden. Kapsel bleibt bis zum Öffnen milchig und blickdicht genug für die Überraschung.

**Abnahme:** Derselbe einmalige Tipp genügt. Keine zusätzliche Wartephase, kein zweiter Pflichtschritt, kein Vollbildblitz. Ruhige Variante zeigt nur den Zustandswechsel ohne wanderndes Licht.

### 4. Objektaktionen am passenden Bauteil

Die bisherige Ganzobjekt-Reaktion um eine gezielte Aktion ergänzen: Flakonkappe drücken → ein kontrollierter Sprühstoß; Weinglas ziehen → sanft schwenken mit nachlaufender Flüssigkeit; Karusselldach antippen → eine kurze zusätzliche Umdrehung mit gedämpftem Auslauf. Das bestehende Dreifachtipp-Easter-Egg bleibt eine eigene Überraschung.

**Integration:** Raycasting auf benannte interaktive Meshes, vorhandene `life`-/`egg`-Funktionen und `Liquid.nudge` nutzen. Drag von Tap trennen. Eine Eingabe darf nicht gleichzeitig Bauteilaktion und Ganzobjektsprung auslösen. Dreifachtipp-Verhalten ausdrücklich mitprüfen. Für die gezielte Aktion eine sekundäre DOM-Bedienmöglichkeit nach der Enthüllung ergänzen; keine neue Pflichtgeste.

**Abnahme:** Verhalten ist auf Touch und mit Tastatur erreichbar. Der externe Link bleibt bedienbar. Aktionen und Partikel haben feste Obergrenzen; rasches Antippen erzeugt keine wachsende Zahl von Timelines oder Objekten. Reduced Motion bietet eine diskrete Rückmeldung ohne Bewegungssequenz.

### 5. Ein bewusster Schlussmoment

Nach dem Landen streift das vorhandene Studiolicht einmal über das Geschenk und kommt zur Ruhe. Glitzer und Suchscheinwerfer nehmen danach deutlich ab; das Objekt darf dezent weiterleben. Der Link erscheint unverzüglich mit der bisherigen Enthüllung und bleibt das klare Handlungsziel. Keine zusätzliche Textkarte.

**Integration:** Übergang nach `revealed`, vorhandenes Key-/Suchlicht und Partikelparameter. Wiederholte Interaktionen dürfen den Link nicht erneut verstecken oder den Schlussmoment endlos neu starten.

**Abnahme:** Eine zusammenhängende Choreografie statt mehrerer konkurrierender Dauereffekte. Keine längere Zeit bis zum Link. Bei Reduced Motion sofort die ruhige Schlussansicht.

## P2 — Optionale Erweiterungen nach P0/P1

### 6. Dezenter, ausdrücklich aktivierter Klang

Materialklänge für Auftreffen, Naht und Enthüllung: gedämpftes Plastik, feines Glas, ein kurzer mechanischer Karussellton. Standard bleibt stumm. Nur bei gesondertem Auftrag einen kleinen Ton-Schalter mit `aria-pressed` ergänzen; dessen aktive Betätigung entsperrt Audio. Der Öffnungstipp allein ist keine Zustimmung zu Ton. Keine Musikschleife. Lokale lizenzierte oder synthetisierte Klänge, mit dokumentierter Herkunft.

**Abnahme:** Audioausfall und gesperrter AudioContext beeinflussen weder Bild noch Link. Stummschalten greift sofort; Tabwechsel pausiert Ton. Kein Berechtigungsdialog. Die zusätzliche Bedienung ist eine optionale Erweiterung der bisherigen Ein-Button-Endansicht und muss als solche beauftragt sein.

### 7. Druckansicht für die physischen Kapseln

Auf der bestehenden QR-Übersicht eine Druckansicht mit drei ausschneidbaren Einlegern anbieten: QR-Code, eindeutige Farbzuordnung und kurze lesbare Ersatz-URL. Vorhandene QR-Dateien wiederverwenden; Zielnamen nur auf Wunsch auf die Vorderseite setzen, damit der Ausdruck die Überraschung nicht vorwegnimmt. Keine Änderung am Scan-Ziel und kein zusätzliches Angebot auf den Kapselseiten.

**Abnahme:** A4-Ausdruck bei 100 % ohne angeschnittene Codes, vier Module Ruhezone erhalten, ausreichend großer dunkler Code auf hellem Grund. Reale Smartphone-Scans des Ausdrucks separat prüfen; ohne Ausdruck keine bestätigte Scanbarkeit behaupten.

## Umsetzung und Prüfung

- Kleine Änderungen nach Zustand und Verantwortung schneiden: Boot/Fallback, Szene, Geschenkaktionen. `gacha.js` hat rund 1.400 Zeilen; beim Bearbeiten gezielt Funktionen oder Geschenkmodule herauslösen, kein pauschales Rewrite. `gachas.js` bleibt die zentrale Kapsel-Konfiguration.
- Neue Optionen standardmäßig deaktivieren oder bestehendes Verhalten als Default erhalten. URLs in Konfiguration, HTML und QR-Generator auf Konsistenz prüfen; Änderungen der Zielseite dürfen nicht die gedruckte Kapsel-URL brechen.
- Vor zusätzlichen GPU-Effekten vorhandene Qualität messen. Bei verborgenem Tab Rendering und wiederkehrende Aktionen pausieren; bei Rückkehr keine aufgestauten Effekte abspielen. GPU-Ressourcen und Listener beim Abbau freigeben. Qualitätsreduktion darf nie den Link beeinträchtigen.
- Werkzeuge: `npm ci`; `npm run serve` startet den statischen Server auf Port 3123. `npm run qr` nur bei QR-Änderungen, `npm run vendor` nur bei bewusst aktualisierten Vendor-Dateien. Für unveränderte Abhängigkeiten keine Versionsmigration.
- Der statische Server bildet Vercels Clean-URL-Routing nicht zwingend ab: lokal auch `/<slug>.html` prüfen; `/<slug>` zusätzlich in einer Vercel-Preview prüfen. Kein Hostingwechsel für diesen Auftrag.
- Alle drei Kapseln prüfen: Normalfall, schneller Tipp während des Auftritts, Mehrfachtipp, Drag, Dreifachtipp, Rückkehr vom externen Link, Tabwechsel, Hoch-/Querformat sowie Reduced Motion. `?debug` stellt den Szenenzustand über `window.__juhulia` bereit.
- Für P0 gezielte Regressionstests der Fehlerübergänge ergänzen. Für visuelle Erweiterungen Desktop und schmalen mobilen Viewport zusammen prüfen, möglichst iOS Safari und Android Chrome auf echten Geräten. Verfügbare Automatisierung nutzen und fehlende Geräteprüfung offen nennen.
- Zum Abschluss geänderte Dateien und Verhalten, tatsächlich ausgeführte Prüfungen und verbleibende Grenzen nennen. README und PRODUCT nur an tatsächlich ausgelieferte Änderungen anpassen. Vorschläge in dieser Datei nicht als bereits implementiert dokumentieren.

**Empfohlener nächster Auftrag:** Zuerst Aufgaben 1 und 2 als kleine, überprüfbare Änderung ausführen. Danach Aufgabe 3 mit Aufgabe 5 als eine gemeinsame Verfeinerung der Öffnungssequenz umsetzen. Objektaktionen anschließend separat bearbeiten; Klang bleibt optional.
