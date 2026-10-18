---
name: Juhulia
description: Gacha capsules from a birthday, opened a second time on screen.
colors:
  bernstein-plastik: "#f2a516"
  bernstein-tiefe: "#150e06"
  bernstein-boden: "#2a1d0e"
  bernstein-glitzer: "#ffd27a"
  bernstein-gedaempft: "#c9ab7c"
  bernstein-knopf: "#f8e4bd"
  bernstein-tinte: "#1f1508"
  rose-plastik: "#f08ca0"
  rose-tiefe: "#160a0e"
  rose-boden: "#2b151c"
  rose-glitzer: "#ffc2cf"
  rose-gedaempft: "#d6a3ae"
  rose-knopf: "#fadbe2"
  rose-tinte: "#2b121a"
  flaschengruen-plastik: "#22a35a"
  flaschengruen-tiefe: "#08140d"
  flaschengruen-boden: "#10241a"
  flaschengruen-glitzer: "#b8f5cf"
  flaschengruen-gedaempft: "#8fc6a3"
  flaschengruen-knopf: "#cdeed9"
  flaschengruen-tinte: "#0b2416"
  graphit-grund: "#101113"
  graphit-flaeche: "#1a1b1e"
  graphit-linie: "#2c2d31"
  knochenweiss-text: "#ecebe8"
  graphit-gedaempft: "#9a9ba1"
  knochenweiss-papier: "#e9e7e3"
  graphit-tinte: "#111214"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 4.25rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 9vw, 3.5rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    letterSpacing: "-0.01em"
  hint:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    letterSpacing: "0.01em"
  caption:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
rounded:
  card: "22px"
  pill: "999px"
spacing:
  gutter: "24px"
  stage-bottom: "56px"
  card-pad: "18px"
  button-x: "26px"
components:
  button-reveal-bernstein:
    backgroundColor: "{colors.bernstein-knopf}"
    textColor: "{colors.bernstein-tinte}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "52px"
  button-reveal-rose:
    backgroundColor: "{colors.rose-knopf}"
    textColor: "{colors.rose-tinte}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "52px"
  button-reveal-flaschengruen:
    backgroundColor: "{colors.flaschengruen-knopf}"
    textColor: "{colors.flaschengruen-tinte}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "52px"
  button-reveal-neutral:
    backgroundColor: "{colors.knochenweiss-papier}"
    textColor: "{colors.graphit-tinte}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "52px"
  card-qr:
    backgroundColor: "{colors.knochenweiss-papier}"
    rounded: "{rounded.card}"
    padding: "18px"
  link-text:
    textColor: "{colors.knochenweiss-text}"
    typography: "{typography.caption}"
    height: "44px"
---

# Design System: Juhulia

## Overview

**Creative North Star: "Die zweite Öffnung"**

The guest already holds a real gacha capsule in their hand, has twisted it open and found a QR code inside. Juhulia opens that same capsule a second time, on screen, and only then shows what it held. Everything visual serves that echo. Every page has one capsule, coloured like its physical original. It stands in a dark studio of its own hue, lit like a product shot, with real weight, real shadow and coloured light falling through the plastic onto the floor. The interface recedes until the capsule has opened and one soft button remains.

The register is serious and warm: good taste over theme. The plastic is frosted, so the gift shows only as a shadow before the opening. Glitter in the air and a slow searchlight give the dark some life without becoming decoration. Density is minimal. Each page holds one object and one action, then one button. Kitsch, gothic props, a toy or comic look and playful copy are all rejected, by the user's explicit call.

**Key Characteristics:**
- One capsule, one tap, one button, nothing competing.
- Each page lives in one hue family: the capsule's colour, and a studio of the same hue, much darker.
- Material light over flat colour: frosted plastic, glass, coloured floor light, a searchlight.
- Physical motion with weight; a still, quiet variant under reduced motion.
- Hanken Grotesk throughout, light at large sizes, medium on the button.

## Colors

Three hue families, one per capsule, each running from saturated plastic down to near-black studio. A graphite family carries the pages that belong to no single capsule.

### Primary
- **Bernstein-Plastik** (zense): the capsule body and the loader's progress bar and floor light; the name in the fallback view.
- **Rosé-Plastik** (Henne.): the same roles on the Henne. page.
- **Flaschengrün-Plastik** (Phantasialand): the same roles on the Phantasialand page.

### Neutral
- **Studio-Tiefe** (`*-tiefe`): the page background and the 3D clear colour; the darkest step of each hue, never pure black.
- **Studio-Boden** (`*-boden`): the cyclorama floor and the lower end of the loading and fallback gradients.
- **Glitzer** (`*-glitzer`): the glitter points, in the 3D scene and on the loading screen.
- **Gedämpft** (`*-gedaempft`): the hint "Tippen zum Öffnen" and the loader note; secondary text tinted from the page hue, never grey (8.7–9.7:1 on the ground).
- **Knopf / Tinte** (`*-knopf`, `*-tinte`): the reveal button's fill and text, a pale tint of the page hue with ink of the same hue (13.2–14.4:1).
- **Graphit** (`graphit-*`, `knochenweiss-*`): the index, the 404 page, focus rings and the default button colours when a page sets no hue.

### Named Rules
**The One Hue Rule.** A capsule page uses only its own hue family. Amber never appears on the Henne. page, and graphite only stands in where no page colour is set.

**The No Pure Black Rule.** The darkest colour of each page is its `*-tiefe`. `#000` does not occur.

## Typography

**Display Font:** Hanken Grotesk (with ui-sans-serif, system-ui), self-hosted as one variable file (`/fonts/hanken.woff2`, weights 100–900).

**Character:** a calm, slightly warm grotesk. Light (300) and tightly tracked at large sizes it reads as a quiet title; medium (500) at small sizes it gives the one button its weight.

### Hierarchy
- **Display** (300, clamp(2.5rem, 7vw, 4.25rem), 1, -0.035em): the index title "Juhulia" and the 404 heading.
- **Headline** (300, clamp(2rem, 9vw, 3.5rem), 1, -0.035em): the capsule name in the fallback view, in the page's plastic colour.
- **Title** (500, 22px, -0.02em): capsule names on the index cards.
- **Body** (400, 17px, 1.5): the index lede, at most 34ch.
- **Label** (500, 17px, -0.01em): the reveal button "Hier geht’s hin".
- **Hint** (400, 16px, +0.01em): "Tippen zum Öffnen", centred above the bottom edge.
- **Caption** (400, 14–15px): hosts and text links on the index.

### Named Rules
**The One Typeface Rule.** Hanken Grotesk only. No second face, no monospace, no all-caps labels.

## Layout

A capsule page is a full-viewport stage (`position: fixed; inset: 0`) with the WebGL canvas behind everything. The capsule sits in the optical centre. Hint and button share one slot, horizontally centred and `max(56px, safe-area + 32px)` above the bottom edge, so the final state never jumps. The whole stage is the open button, so the touch target is the full screen. The camera frames the capsule at rest and moves in on the gift after the opening. The lid lands inside the visible width, measured at its own depth.

The fallback and no-JavaScript view centres the capsule name and the button vertically, 28px apart, on the page's floor gradient.

The index is a single column up to a 1180px container, with gutters clamp(16px, 5vw, 64px) and an auto-fit grid of QR cards (minimum 250px). Vertical rhythm is generous: clamp(48px, 9vw, 112px) above the title, clamp(48px, 8vw, 96px) before the grid.

## Elevation & Depth

Depth comes from light, not from UI shadows. The 3D scene provides it: a studio cyclorama, a wandering key light, rim and fill lights, a searchlight with a visible beam, soft shadow maps, contact shadows and coloured light under the plastic. The flat UI is almost shadowless. Only the reveal button carries one soft, offset shadow so it sits on the scene rather than in it.

### Shadow Vocabulary
- **Button lift** (`box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.7)`): the reveal button only.

### Named Rules
**The Light Is the Depth Rule.** Depth comes from the scene's lights and shadows. UI elements stay flat, with no glow halos and no coloured zero-offset shadows.

## Shapes

Soft, round forms that echo the capsule itself. The button is a full pill (999px). QR cards are gently rounded (22px). The loader is a thin ring with round line caps. The focus ring of the full-screen open button follows a rounded inset (28px radius, -20px offset). Hard corners do not appear in the UI.

## Components

### Buttons
Soft and tactile: one rounded, slightly lifted pill that feels like a real button, and the only next step on the page.
- **Shape:** full pill (999px), at least 52px high, 26px side padding, so the touch target clears 44 × 44.
- **Primary (reveal):** the page's `*-knopf` fill with `*-tinte` text, "Hier geht’s hin" plus a 16px drawn arrow (1.5px stroke, round caps). The label names the destination host for assistive technology.
- **Hover / Focus / Active:** lifts 1px and brightens 4% on hover; presses to 0.98 on active; 2px light focus ring at 4px offset. A light sheen passes over it three times after it appears, never more (off under reduced motion).
- **Appearance:** fades up from 16px below and 0.98 scale over 0.8s with an exponential ease-out; takes keyboard focus when the capsule has opened.

### Cards / Containers
- **QR card (index):** paper surface tinted to the capsule's colour (#f6e8cc / #f8e4e8 / #dcf0e3), 22px radius, 18px padding, dark code on light ground; lifts 3px on hover. Below it: the name (Title), the host (Caption) and a hairline divider before the text links.

### Navigation
- **Text links (index, 404):** underlined, 1px thickness, offset 5px in muted colour, turning to full text colour on hover; at least 44px high; never broken across lines.

### Loading screen (signature)
The studio before the light comes on. It uses the page's deep-to-floor gradient, a blurred floor glow in the plastic colour, about 70 twinkling glitter points and a 44px progress ring showing real byte progress. A quiet "Lädt …" appears only after 3s. It fades out over 0.85s once everything is compiled and warmed up, while the entrance begins.

### Fallback view (signature)
The page's own colours without the scene. It shows the capsule name as a Headline in the plastic colour and the reveal button below, centred. Nothing covers it. It is used without JavaScript and whenever the scene cannot run.

## Do's and Don'ts

### Do:
- **Do** keep every capsule page inside its own hue family (The One Hue Rule).
- **Do** tint secondary text from the page hue (`*-gedaempft`) and keep it at 4.5:1 or more on the ground.
- **Do** let the reveal button be the only control after the opening: one pill, `*-knopf` on `*-tinte`, at least 52px high.
- **Do** give depth through the scene's light; keep the UI flat apart from the button's one soft shadow.
- **Do** keep the hint and the button in the same bottom slot so the final state never shifts.
- **Do** keep the link reachable in every state: no JavaScript, no WebGL, slow loading, a lost context.

### Don't:
- **Don't** use kitsch, gothic props, a toy or comic look, or playful copy.
- **Don't** introduce a second typeface, all-caps labels or monospace.
- **Don't** use pure black, grey secondary text or colours from another capsule's family.
- **Don't** add glow halos, coloured zero-offset shadows or glass blur to UI elements.
- **Don't** add controls or text cards around the capsule before the opening.
- **Don't** let any motion continue under reduced motion: no knocks, sweeps, flight, shake or fireworks.
