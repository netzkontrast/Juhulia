# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js, deployed on Vercel. The capsule animation is rendered with Three.js.

## Users

Guests at a birthday who open a physical gacha capsule and find a QR code inside. They scan it with their phone, standing or seated at the party, usually in dim indoor light.

## Product Purpose

Juhulia is the moment between scanning the QR code and arriving at the gift behind it. Each QR code opens the same page with its own identifier; the page shows a single gacha capsule on black. One tap opens the capsule in 3D, and the page then forwards to that code's external destination.

Success: the scan feels like opening something of value, and every code reliably lands on its own destination.

## Positioning

The physical capsule is echoed by a digital one: the real object in the guest's hand is opened a second time on screen before the gift is revealed.

## Operating Context

- Entry is always a phone camera scan of a QR code found inside a physical gacha capsule.
- Each QR code encodes the page URL plus an identifier (e.g. `?g=<slug>`); the page maps the identifier to an external URL.
- The destination pages are external and not part of this product. No additional content is shown on Juhulia itself.

## Capabilities and Constraints

- One screen: capsule on black, a tap to open, a light-led opening animation, then a redirect.
- Mapping from identifier to external URL is configuration; the real slugs and URLs are not decided yet.
- Undecided: behaviour for an unknown or missing identifier.

## Brand Commitments

- Black page. Only the capsule and light; no other illustration of the birthday.
- Serious register: no comic or toy look, no jokes or playful copy.

## Evidence on Hand

None. No slugs, destination URLs, photos or brand assets exist yet; do not invent them.

## Product Principles

1. The capsule is the whole interface; nothing competes with it.
2. Weight over whimsy: the opening is slow, deliberate and lit, not bouncy.
3. The redirect must never fail silently; each code lands on its destination.
