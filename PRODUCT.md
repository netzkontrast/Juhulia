# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and JavaScript (no framework, no build step), deployed on Vercel at https://juhulia.vercel.app. Three.js renders the capsule, GSAP choreographs entrances and weather.

## Users

Guests at a birthday who open a physical gacha capsule and find a QR code inside. They scan it with their phone, standing or seated at the party, usually in dim indoor light.

## Product Purpose

Juhulia is the moment between scanning the QR code and discovering the gift behind it. Each QR code opens its own capsule page: a single gacha capsule in a dark graphite studio. One tap bursts it open, an object that stands for the gift jumps out, and the gift's link appears beneath it. There is no automatic redirect.

Success: the scan feels like opening something of value, and every page reliably shows its own link.

## Positioning

The physical capsule is echoed by a digital one: the real object in the guest's hand is opened a second time on screen before the gift is revealed.

## Operating Context

- Entry is always a phone camera scan of a QR code found inside a physical gacha capsule.
- Each QR code encodes its capsule page, `https://juhulia.vercel.app/<slug>`; that page reveals a button with its external link.
- The destination pages are external and not part of this product. No additional content is shown on Juhulia itself.

## Capabilities and Constraints

- One screen per capsule: the capsule enters, stays alive while it waits (knocks, wandering light, leans toward finger or phone tilt), a tap bursts it open, the gift object (flacon, wine glass, golden ticket) jumps out and settles, and the domain appears as a button.
- Pages and destinations: /zense → zenseofficial.de, /henne → henne-weinbar.de, /phantasialand → phantasialand.de. QR codes encode https://juhulia.vercel.app/<slug>.
- Unknown paths show a short 404 page linking to the index.

## Brand Commitments

- Neutral and dark: a graphite photo studio, smoked-glass capsule over graphite. Good taste over theme; no kitsch (no gothic props, no toy look). Pinned by the user.
- Serious register: no comic or toy look, no jokes or playful copy.
- Motion is physical and rich: weight, spin, a brief slow-motion at the gift's apex.
- Each capsule page has its own entrance and its own gift object; the end state is the domain as the only button.

## Evidence on Hand

Destination URLs above. No photos or brand assets of the destinations are used; do not invent them.

## Product Principles

1. The capsule is the whole interface; nothing competes with it.
2. Weight over whimsy: entrances may move with physical weight (a drop, an approach, a rise), the opening is slow, deliberate and lit.
3. The link must always be reachable: if the scene cannot start, the page shows the link anyway.
