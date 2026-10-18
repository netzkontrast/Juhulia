---
target: juhulia.vercel.app (gothic version)
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "url:https://juhulia.vercel.app/"
timestamp: 2026-10-18T08-02-13Z
slug: juhulia-vercel-app
closed: true
---
Method: dual-agent (A: design review · B: detector + browser)
Target: https://juhulia.vercel.app at commit 985804b (gothic crypt version, since replaced by the graphite redesign in netzkontrast/Juhulia#3)

Heuristics (Experience; 7 and 10 n/a): 1:2 2:4 3:3 4:3 5:3 6:4 8:3 9:1 → 23/32 (Good, bottom of band)
Specificity: gothic world coherent and product-specific; the capsule itself generic (glossy sphere, spotlight).
Detector: 5× radial-halo, all from the index candle flame in shared site.css (false positives on pages without it); browser: index 1, capsule pages 0.

Priority issues:
- [P1] Load failure leaves a dead black screen (three/gsap failing, no WebGL context-loss handling).
- [P1] First seconds give no orientation, worst on Henne. (near-black approach, name hidden until settle).
- [P2] Idle states differ mostly by tint.
- [P2] Lower third of the viewport is dead black.
- [P2] End screen (cream + small text) breaks the world at the peak-end moment.
Personas: Casey (mobile, dim room) sees a broken-looking black screen on slow wifi; Jordan waits ~5–7 s on Henne. with nothing to do; Sam: h1 announced after the action.
