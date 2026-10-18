# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and JavaScript (no framework, no build step), deployed on Vercel at https://juhulia.vercel.app. Three.js renders the capsule, GSAP choreographs entrances and weather.

## Users

Guests at a birthday who open a physical gacha capsule and find a QR code inside. They scan it with their phone, standing or seated at the party, usually in dim indoor light.

## Product Purpose

Juhulia is the moment between scanning the QR code and arriving at the gift behind it. Each QR code opens its own capsule page; the page shows a single gacha capsule in a dark crypt. One tap opens the capsule in 3D, and the page then forwards to that code's external destination.

Success: the scan feels like opening something of value, and every code reliably lands on its own destination.

## Positioning

The physical capsule is echoed by a digital one: the real object in the guest's hand is opened a second time on screen before the gift is revealed.

## Operating Context

- Entry is always a phone camera scan of a QR code found inside a physical gacha capsule.
- Each QR code encodes its capsule page, `https://juhulia.vercel.app/<slug>`; that page forwards to its external URL.
- The destination pages are external and not part of this product. No additional content is shown on Juhulia itself.

## Capabilities and Constraints

- One screen per capsule: the capsule enters, the crypt stays alive while it waits, a tap opens it, light floods, then a redirect.
- Pages and destinations: /zense → zenseofficial.de, /henne → henne-weinbar.de, /phantasialand → phantasialand.de. QR codes encode https://juhulia.vercel.app/<slug>.
- Unknown paths show a short 404 page linking to the index.

## Brand Commitments

- Gothic ("Gruftie") world: black, candlelight, fog, gothic windows, blackletter. Pinned by the user.
- Serious register: no comic or toy look, no jokes or playful copy.
- The scene stays alive before the tap; each capsule page has its own entrance and opening.

## Evidence on Hand

Destination URLs above. No photos or brand assets of the destinations are used; do not invent them.

## Product Principles

1. The capsule is the whole interface; nothing competes with it.
2. Weight over whimsy: entrances may move with physical weight (a drop, an approach, a rise), the opening is slow, deliberate and lit.
3. The redirect must never fail silently; each code lands on its destination.
