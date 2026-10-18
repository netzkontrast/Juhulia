// A capsule in a graphite studio. It arrives its own way, waits (something knocks
// inside, the light wanders, it leans toward the finger), and when touched it
// bursts open: the lid flies off, the gift jumps out, hangs for a moment in slow
// motion and settles in front of the viewer. Then its link appears.
import * as THREE from 'three';
import { GACHAS } from './gachas.js';

const gsap = window.gsap;

const FLOOR = -1;
const GRAVITY = 14;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const rand = (a, b) => a + Math.random() * (b - a);
const damp = (current, target, lambda, dt) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
const nearest = (angle, step) => Math.round(angle / step) * step;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // to (-π, π]

/* ---------- textures ---------- */

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const softTexture = () =>
  canvasTexture(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

const FONT = '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif';

/* ---------- the gifts ---------- */

function glassMaterial(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0,
    transmission: 1,
    thickness: 0.35,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.4,
    ...opts,
  });
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

// zense: a perfume flacon with amber juice, a brushed collar and a faceted black cap.
function makeFlacon() {
  const root = new THREE.Group();
  const g = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(0.95, 1.05, 0.12), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 16 });
  bodyGeo.center();
  const body = new THREE.Mesh(bodyGeo, glassMaterial({ thickness: 0.3, color: 0xf4f1ea, envMapIntensity: 2 }));
  const juiceGeo = new THREE.ExtrudeGeometry(roundedRect(0.78, 0.7, 0.08), { depth: 0.28, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  juiceGeo.center();
  // opaque: three.js does not render a transmissive object seen through another one
  const juice = new THREE.Mesh(juiceGeo, new THREE.MeshPhysicalMaterial({ color: 0xc27a22, roughness: 0.18, clearcoat: 1, emissive: 0x3a1c04, envMapIntensity: 1.2 }));
  juice.position.y = -0.12;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 48), new THREE.MeshStandardMaterial({ color: 0xcfc9bf, metalness: 1, roughness: 0.28 }));
  collar.position.y = 0.6;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.5, 8),
    new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 }),
  );
  cap.position.y = 0.92;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.18),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      map: canvasTexture(512, 154, (c, w, h) => {
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.font = `400 96px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('zense', w / 2, h / 2 + 4);
      }),
    }),
  );
  label.position.set(0, 0.18, 0.272);
  g.add(body, juice, collar, cap, label);
  g.position.y = -0.1;
  root.add(g);
  return { root, height: 2.2, update() {} };
}

// Henne.: a stemmed glass of red wine; the wine sloshes when the glass moves.
function makeWineGlass() {
  const root = new THREE.Group();
  const g = new THREE.Group();
  const prof = [
    [0.0, 0], [0.4, 0], [0.42, 0.015], [0.4, 0.03], [0.08, 0.06], [0.04, 0.12], [0.032, 0.5], [0.034, 0.74],
    [0.07, 0.8], [0.2, 0.86], [0.31, 0.96], [0.37, 1.12], [0.38, 1.3], [0.36, 1.48], [0.33, 1.62],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glassMaterial({ side: THREE.DoubleSide, thickness: 0.08 }));
  const wineMat = new THREE.MeshPhysicalMaterial({
    color: 0x6a0812,
    roughness: 0.06,
    transmission: 0.35,
    thickness: 0.6,
    ior: 1.34,
    clearcoat: 1,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
  });
  const wprof = [[0.0, 0.83], [0.07, 0.83], [0.19, 0.88], [0.29, 0.97], [0.345, 1.1], [0.35, 1.16]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(wprof, 96), wineMat);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(0.35, 64), wineMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 1.16;
  g.add(glass, bowl, surface);
  g.position.y = -0.85;
  root.add(g);
  const slosh = { x: 0, z: 0, vx: 0, vz: 0 };
  return {
    root,
    height: 1.7,
    // tilt the surface against the glass's own motion, on a damped spring
    update(dt, accel) {
      slosh.vx += (-accel.z * 0.04 - slosh.x * 60) * dt;
      slosh.vz += (accel.x * 0.04 - slosh.z * 60) * dt;
      slosh.vx *= Math.exp(-3 * dt);
      slosh.vz *= Math.exp(-3 * dt);
      slosh.x += slosh.vx * dt;
      slosh.z += slosh.vz * dt;
      surface.rotation.set(-Math.PI / 2 + clamp(slosh.x, -0.35, 0.35), 0, clamp(slosh.z, -0.35, 0.35));
    },
  };
}

// Phantasialand: a golden admission ticket with notched edges and an engraved face.
function makeTicket() {
  const root = new THREE.Group();
  const w = 1.7;
  const h = 0.82;
  const r = 0.06;
  const n = 0.11;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, -n);
  s.absarc(w / 2, 0, n, -Math.PI / 2, Math.PI / 2, true);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, n);
  s.absarc(-w / 2, 0, n, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 24 });
  geo.center();
  const plate = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd9b46a, metalness: 1, roughness: 0.26, envMapIntensity: 1.5 }));
  const face = (backSide) =>
    canvasTexture(1024, 494, (c, W, H) => {
      c.strokeStyle = 'rgba(70,48,12,0.75)';
      c.fillStyle = 'rgba(70,48,12,0.85)';
      c.lineWidth = 3;
      c.strokeRect(34, 34, W - 68, H - 68);
      c.setLineDash([8, 10]);
      c.beginPath();
      c.moveTo(W * 0.74, 44);
      c.lineTo(W * 0.74, H - 44);
      c.stroke();
      c.setLineDash([]);
      c.textBaseline = 'middle';
      if (backSide) {
        c.textAlign = 'center';
        c.font = `300 44px ${FONT}`;
        c.fillText('Juhulia', W * 0.37, H / 2);
        return;
      }
      c.textAlign = 'left';
      c.font = `500 30px ${FONT}`;
      c.fillText('EINTRITT', 80, 120);
      c.font = `400 76px ${FONT}`;
      c.fillText('Phantasialand', 76, 250);
      c.font = `400 28px ${FONT}`;
      c.fillText('Brühl', 80, 360);
      c.save();
      c.translate(W * 0.87, H / 2);
      c.rotate(-Math.PI / 2);
      c.textAlign = 'center';
      c.font = `500 30px ${FONT}`;
      c.fillText('ADMIT ONE', 0, 0);
      c.restore();
    });
  const faceMat = (back) => new THREE.MeshStandardMaterial({ map: face(back), transparent: true, metalness: 0.6, roughness: 0.5, depthWrite: false });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat(false));
  front.position.z = 0.022;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat(true));
  back.position.z = -0.022;
  back.rotation.y = Math.PI;
  root.add(plate, front, back);
  return { root, height: 1.0, update() {} };
}

const GIFTS = { flacon: makeFlacon, wineglass: makeWineGlass, ticket: makeTicket };

/* ---------- the page ---------- */

export function start(slug) {
  const g = GACHAS[slug];
  const root = document.querySelector('[data-stage]');
  const canvas = root.querySelector('canvas');
  const button = root.querySelector('[data-open]');
  const hint = root.querySelector('[data-hint]');
  const reveal = root.querySelector('[data-reveal]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const showLink = () => {
    reveal.hidden = false;
    requestAnimationFrame(() => reveal.classList.add('is-visible'));
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    // No WebGL: the link is all there is.
    button.remove();
    hint.remove();
    showLink();
    window.__juhuliaReady = true;
    return;
  }
  window.__juhuliaReady = true;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x101113, 1);
  renderer.useLegacyLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x101113, 14, 34);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const soft = softTexture();

  // Studio reflections: a big overhead softbox and two strips.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x0c0c0d);
  const box = (w, h, c, p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...p);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(6, 3, new THREE.Color(3.2, 3.2, 3.1), [0, 6, 1]);
  box(0.6, 6, new THREE.Color(1.6, 1.6, 1.6), [-5, 1, 3]);
  box(0.6, 6, new THREE.Color(1.1, 1.1, 1.15), [5, 1, 2]);
  box(8, 1.2, new THREE.Color(0.25, 0.25, 0.26), [0, -3, 4]);
  scene.environment = pmrem.fromScene(env, 0.02).texture;

  /* studio: one seamless sheet, a floor that curves up into the back wall */
  const studioGeo = (() => {
    const front = 14; // z of the near edge
    const flat = 22; // length of the flat floor
    const R = 6; // radius of the cove
    const up = 24; // height of the wall
    const L = flat + (Math.PI / 2) * R + up;
    const geo = new THREE.PlaneGeometry(80, L, 1, 220);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getY(i) + L / 2; // 0 at the near edge, L at the top of the wall
      let y;
      let z;
      if (u < flat) {
        y = FLOOR;
        z = front - u;
      } else if (u < flat + (Math.PI / 2) * R) {
        const a = (u - flat) / R;
        y = FLOOR + R * (1 - Math.cos(a));
        z = front - flat - R * Math.sin(a);
      } else {
        y = FLOOR + R + (u - flat - (Math.PI / 2) * R);
        z = front - flat - R;
      }
      pos.setXYZ(i, pos.getX(i), y, z);
    }
    geo.computeVertexNormals();
    return geo;
  })();
  const studio = new THREE.Mesh(studioGeo, new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.82, side: THREE.DoubleSide }));
  studio.receiveShadow = true;
  scene.add(studio);

  /* light: a key that wanders, a cool rim, a fill */
  const key = new THREE.SpotLight(0xffffff, 2.6, 30, 0.55, 0.9, 1.2);
  key.position.set(0, 7, 3);
  key.target.position.set(0, FLOOR, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 8;
  key.shadow.bias = -0.0004;
  const rim = new THREE.DirectionalLight(0xdfe6ff, 0.9);
  rim.position.set(-4, 3, -6);
  const fill = new THREE.HemisphereLight(0xffffff, 0x101113, 0.35);
  const flash = new THREE.PointLight(0xffffff, 0, 8, 2);
  flash.position.set(0, 0.4, 1);
  scene.add(key, key.target, rim, fill, flash);

  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ map: soft, color: 0x2a2b2e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = FLOOR + 0.003;
  scene.add(pool);

  /* the capsule: smoked glass over graphite, a fine seam */
  const cap = new THREE.Group(); // entrance motion
  scene.add(cap);
  const body = new THREE.Group(); // tilt, knocks, trembling
  cap.add(body);
  const lid = new THREE.Group();
  body.add(lid);
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x8a8f99,
      roughness: 0.08,
      transmission: 0.82,
      thickness: 0.4,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      attenuationColor: new THREE.Color(0x3a3e46),
      attenuationDistance: 1.4,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    }),
  );
  top.castShadow = true;
  lid.add(top);
  const base = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x2a2b2f, roughness: 0.55, metalness: 0.2, clearcoat: 0.2, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
  );
  base.castShadow = true;
  base.receiveShadow = true;
  body.add(base);
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 1, roughness: 0.22, emissive: 0xffffff, emissiveIntensity: 0 });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(1.004, 0.013, 12, 160), seamMat);
  seam.rotation.x = Math.PI / 2;
  body.add(seam);
  const lidSeam = new THREE.Mesh(new THREE.TorusGeometry(1.004, 0.009, 12, 160), seamMat);
  lidSeam.rotation.x = Math.PI / 2;
  lidSeam.position.y = 0.004;
  lid.add(lidSeam);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.99, 96), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.9 }));
  inside.rotation.x = -Math.PI / 2;
  inside.position.y = -0.004;
  body.add(inside);

  const contactMat = new THREE.MeshBasicMaterial({ map: soft, color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = FLOOR + 0.006;
  scene.add(contact);
  const lidContactMat = contactMat.clone();
  lidContactMat.opacity = 0;
  const lidContact = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), lidContactMat);
  lidContact.rotation.x = -Math.PI / 2;
  lidContact.position.y = FLOOR + 0.005;
  scene.add(lidContact);

  /* the gift: first a shadow behind the smoked glass */
  const gift = GIFTS[g.object]();
  const giftScaleInside = 1.15 / gift.height;
  gift.root.scale.setScalar(giftScaleInside);
  gift.root.position.set(0, 0.05, 0);
  gift.root.traverse((o) => (o.castShadow = true));
  body.add(gift.root);

  /* glints thrown out when it bursts */
  const GN = 90;
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GN * 3), 3));
  const glints = new THREE.Points(
    glintGeo,
    new THREE.PointsMaterial({ map: soft, color: 0xffffff, size: 0.07, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glints.frustumCulled = false;
  scene.add(glints);
  const glintVel = Array.from({ length: GN }, () => new THREE.Vector3());

  /* ---------- framing ---------- */

  let dist = 14;
  let framing = 0; // 0 = the capsule, 1 = the gift
  const look = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const shake = new THREE.Vector3();

  const fit = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max(2 / 0.52 / (2 * tan * camera.aspect), 2 / 0.34 / (2 * tan));
  };
  fit();
  new ResizeObserver(fit).observe(canvas);

  const placeCamera = (dt, snap = false) => {
    camTarget.set(0, THREE.MathUtils.lerp(1.1, 1.5, framing), THREE.MathUtils.lerp(dist, dist * 0.85, framing));
    lookTarget.set(0, THREE.MathUtils.lerp(-0.15, 0.85, framing), THREE.MathUtils.lerp(0, 0.9, framing));
    if (snap) {
      camPos.copy(camTarget);
      look.copy(lookTarget);
    } else {
      camPos.lerp(camTarget, 1 - Math.exp(-3 * dt));
      look.lerp(lookTarget, 1 - Math.exp(-3 * dt));
    }
    camera.position.copy(camPos).add(shake);
    camera.lookAt(look);
  };
  placeCamera(0, true);

  const kick = (amp, dur = 0.45) => {
    if (reduce) return;
    gsap.fromTo(shake, { y: -amp, x: amp * rand(-0.6, 0.6) }, { y: 0, x: 0, duration: dur, ease: 'elastic.out(1, 0.35)' });
  };

  /* ---------- pointer and device tilt ---------- */

  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    lean.tx = (e.clientX / window.innerWidth) * 2 - 1;
    lean.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  window.addEventListener(
    'deviceorientation',
    (e) => {
      if (e.gamma == null) return;
      lean.tx = clamp(e.gamma / 25, -1, 1);
      lean.ty = clamp((e.beta - 45) / 25, -1, 1);
    },
    { passive: true },
  );
  // iOS asks for permission, and only from a touch.
  const askTilt = () => {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
  };

  /* ---------- state ---------- */

  const state = { mode: 'entering', queued: false, sim: 0, timeScale: 1, burst: false };
  const knock = { vx: 0, vz: 0, x: 0, z: 0, hop: 0, hopV: 0 };
  const lidPhys = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), rest: false };
  const giftPhys = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), mode: 'inside', scale: giftScaleInside };
  const giftHome = new THREE.Vector3(0, 1.35, 1.4);
  const giftAccel = new THREE.Vector3();
  const lastGiftVel = new THREE.Vector3();
  const drag = { on: false, x: 0, v: 0, yaw: 0 };

  /* ---------- entrances ---------- */

  const squash = (amt) => {
    if (reduce) return;
    gsap.fromTo(cap.scale, { y: 1 - amt, x: 1 + amt * 0.6, z: 1 + amt * 0.6 }, { y: 1, x: 1, z: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  };

  const entrances = {
    // Falls out of the dark, lands hard, one rebound, settles.
    drop() {
      cap.position.set(0, 9, 0);
      cap.rotation.set(0.1, -1.2, 0);
      return gsap
        .timeline({ onComplete: settle, delay: 0.35 })
        .to(cap.position, { y: 0, duration: 0.8, ease: 'power2.in' })
        .add(() => {
          squash(0.16);
          kick(0.12);
        })
        .to(cap.position, { y: 0.42, duration: 0.24, ease: 'power2.out' })
        .to(cap.position, { y: 0, duration: 0.24, ease: 'power2.in' })
        .add(() => {
          squash(0.06);
          kick(0.04);
        })
        .to(cap.rotation, { y: 0.35, x: 0, duration: 1.6, ease: 'power3.out' }, 0);
    },
    // Rolls out of the depth of the studio and comes to rest, rocking.
    roll() {
      const Z = -16;
      cap.position.set(0, 0, Z);
      cap.rotation.set(Z, 0.3, 0); // a rolling sphere turns by distance / radius
      return gsap
        .timeline({ onComplete: settle, delay: 0.3 })
        .to(cap.position, { z: 0, duration: 2.6, ease: 'power3.out' })
        .to(cap.rotation, { x: 0, duration: 2.6, ease: 'power3.out' }, 0)
        .to(cap.rotation, { x: 0.12, duration: 0.35, ease: 'sine.out' }, 2.45)
        .to(cap.rotation, { x: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    },
    // Catapulted in from the left on a high arc, spinning; lands and skids to centre.
    launch() {
      const p = { t: 0 };
      const from = new THREE.Vector3(-7, 1, 2);
      const peak = 4.2;
      cap.position.copy(from);
      return gsap
        .timeline({ onComplete: settle, delay: 0.3 })
        .to(p, {
          t: 1,
          duration: 1.15,
          ease: 'none',
          onUpdate: () => {
            const k = p.t;
            cap.position.x = THREE.MathUtils.lerp(from.x, 0.25, k);
            cap.position.z = THREE.MathUtils.lerp(from.z, 0, k);
            cap.position.y = THREE.MathUtils.lerp(from.y, 0, k) + 4 * peak * k * (1 - k);
            cap.rotation.z = -k * Math.PI * 2.5;
            cap.rotation.y = k * 1.4;
          },
        })
        .add(() => {
          squash(0.14);
          kick(0.1);
        })
        .to(cap.position, { x: 0, duration: 0.5, ease: 'power3.out' })
        .to(cap.rotation, { z: -Math.PI * 2, duration: 0.6, ease: 'back.out(2)' }, '<');
    },
  };

  /* ---------- waiting: something knocks inside ---------- */

  let knockCall = null;
  const scheduleKnock = () => {
    knockCall = gsap.delayedCall(rand(1.8, 4.2), () => {
      if (state.mode !== 'idle') return;
      const strong = Math.random() < 0.35;
      const a = rand(0, Math.PI * 2);
      const f = strong ? 2.2 : 1.1;
      knock.vx += Math.cos(a) * f;
      knock.vz += Math.sin(a) * f;
      knock.hopV += strong ? 2.2 : 1.2;
      if (strong) {
        kick(0.02, 0.3);
        gsap.delayedCall(0.18, () => {
          if (state.mode !== 'idle') return;
          knock.vx -= Math.cos(a) * f * 0.6;
          knock.vz -= Math.sin(a) * f * 0.6;
          knock.hopV += 0.8;
        });
      }
      scheduleKnock();
    });
  };

  function settle() {
    state.mode = 'idle';
    hint.classList.add('is-visible');
    scheduleKnock();
    if (state.queued) open();
  }

  /* ---------- opening ---------- */

  function open() {
    askTilt();
    if (state.mode === 'entering') {
      state.queued = true;
      return;
    }
    if (state.mode !== 'idle') return;
    state.mode = 'opening';
    state.sim = 0;
    hint.classList.remove('is-visible');
    knockCall?.kill();
    button.remove();
  }
  button.addEventListener('click', open);

  if (reduce) settle();
  else entrances[g.entrance]();

  function burst() {
    state.burst = true;
    // the lid leaves the capsule, into world space
    lid.updateWorldMatrix(true, false);
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    lid.matrixWorld.decompose(p, q, new THREE.Vector3());
    body.remove(lid);
    scene.add(lid);
    lid.position.copy(p);
    lid.quaternion.copy(q);
    lidPhys.pos.copy(p);
    const side = Math.random() < 0.5 ? -1 : 1;
    lidPhys.vel.set(side * rand(1.6, 2.2), rand(5.2, 6), rand(-0.6, -1.4));
    lidPhys.rot.setFromQuaternion(q);
    lidPhys.spin.set(rand(-7, -4), rand(-2, 2), side * rand(4, 7));

    // the gift jumps out
    const gp = new THREE.Vector3();
    gift.root.getWorldPosition(gp);
    body.remove(gift.root);
    scene.add(gift.root);
    gift.root.position.copy(gp);
    gift.root.rotation.set(0, 0, 0);
    giftPhys.pos.copy(gp);
    giftPhys.vel.set(rand(-0.25, 0.25), 7.4, 0.9);
    const ticket = g.object === 'ticket';
    giftPhys.spin.set(ticket ? 9 : 2.5, ticket ? 6 : 7.5, ticket ? 3 : 0.6);
    giftPhys.mode = 'flying';

    const pos = glints.geometry.attributes.position;
    for (let i = 0; i < GN; i++) {
      pos.setXYZ(i, cap.position.x + rand(-0.4, 0.4), 0.1, cap.position.z + rand(-0.4, 0.4));
      const a = rand(0, Math.PI * 2);
      const sp = rand(1.5, 5);
      glintVel[i].set(Math.cos(a) * sp, rand(3, 8), Math.sin(a) * sp * 0.6 + 1);
    }
    glints.material.opacity = 1;

    gsap.fromTo(flash, { intensity: 4.5 }, { intensity: 0, duration: 0.9, ease: 'power2.out' });
    kick(0.16, 0.6);
    squash(0.12);
  }

  /* ---------- once revealed: drag to turn the gift ---------- */

  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'revealed') return;
    drag.on = true;
    drag.x = e.clientX;
    drag.v = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag.on) return;
    const dx = e.clientX - drag.x;
    drag.x = e.clientX;
    drag.v = dx * 0.012;
    drag.yaw += drag.v;
  });
  const endDrag = () => (drag.on = false);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  /* ---------- frame loop ---------- */

  let last = performance.now();
  let t = 0;
  const tmpV = new THREE.Vector3();
  const LID_GROUND = FLOOR + 0.5;

  const tick = (now) => {
    requestAnimationFrame(tick);
    // rAF timestamps can be slightly older than the last performance.now(); never step backwards
    const realDt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    t += realDt;

    // the key light wanders slowly; highlights travel over the glass
    key.position.x = Math.sin(t * 0.22) * 3.2;
    key.position.z = 3 + Math.cos(t * 0.17) * 1.2;
    pool.position.x = key.position.x * 0.15;

    lean.x = damp(lean.x, lean.tx, 2.5, realDt);
    lean.y = damp(lean.y, lean.ty, 2.5, realDt);

    // knocks: a damped spring on the capsule's tilt, plus a small hop
    knock.vx += -knock.x * 140 * realDt;
    knock.vz += -knock.z * 140 * realDt;
    knock.vx *= Math.exp(-7 * realDt);
    knock.vz *= Math.exp(-7 * realDt);
    knock.x += knock.vx * realDt;
    knock.z += knock.vz * realDt;
    knock.hopV -= GRAVITY * realDt;
    knock.hop = Math.max(0, knock.hop + knock.hopV * realDt);
    if (knock.hop === 0 && knock.hopV < 0) knock.hopV = 0;

    if (state.mode === 'idle' || state.mode === 'entering') {
      body.rotation.set(knock.x * 0.08 + lean.y * 0.07, 0, knock.z * 0.08 - lean.x * 0.1);
      body.position.y = knock.hop * 0.06;
      if (state.mode === 'idle') cap.rotation.y += realDt * 0.12;
      gift.root.position.set(knock.z * 0.04, 0.05 + knock.hop * 0.12, -knock.x * 0.04);
      gift.root.rotation.y += realDt * 0.3;
    } else {
      // slow motion while the gift hangs at its apex
      if (state.mode === 'opening') {
        const apex = giftPhys.mode === 'flying' && giftPhys.vel.y < 1.6 && giftPhys.vel.y > -1.2;
        state.timeScale = damp(state.timeScale, apex && !reduce ? 0.22 : 1, apex ? 14 : 5, realDt);
      } else {
        state.timeScale = 1;
      }
      const dt = realDt * state.timeScale;
      state.sim += dt;
      const s = state.sim;

      // 1) anticipation: the capsule trembles harder and harder, the seam heats up
      if (!state.burst) {
        const k = clamp(s / 0.9);
        body.rotation.set(Math.sin(s * 47) * 0.05 * k, 0, Math.sin(s * 53 + 1) * 0.07 * k);
        body.position.y = Math.abs(Math.sin(s * 31)) * 0.04 * k;
        seamMat.emissiveIntensity = k * k * 1.4;
        if (s >= 0.9) {
          body.rotation.set(0, 0, 0);
          body.position.y = 0;
          seamMat.emissiveIntensity = 0;
          burst();
        }
      }

      // 2) the lid tumbles, bounces and comes to rest dome-up on the floor
      if (state.burst) {
        if (!lidPhys.rest) {
          lidPhys.vel.y -= GRAVITY * dt;
          lidPhys.pos.addScaledVector(lidPhys.vel, dt);
          lidPhys.rot.x += lidPhys.spin.x * dt;
          lidPhys.rot.y += lidPhys.spin.y * dt;
          lidPhys.rot.z += lidPhys.spin.z * dt;
          if (lidPhys.pos.y < LID_GROUND) {
            lidPhys.pos.y = LID_GROUND;
            if (Math.abs(lidPhys.vel.y) > 1.4) {
              lidPhys.vel.y *= -0.32;
              lidPhys.vel.x *= 0.6;
              lidPhys.vel.z *= 0.6;
              lidPhys.spin.multiplyScalar(0.4);
              kick(0.03, 0.3);
            } else {
              lidPhys.rest = true;
            }
          }
        } else {
          lidPhys.pos.x += lidPhys.vel.x * dt;
          lidPhys.pos.z += lidPhys.vel.z * dt;
          lidPhys.vel.multiplyScalar(Math.exp(-4 * dt));
          lidPhys.pos.y = damp(lidPhys.pos.y, FLOOR, 6, dt);
          lidPhys.rot.x = damp(lidPhys.rot.x, nearest(lidPhys.rot.x, Math.PI * 2), 5, dt);
          lidPhys.rot.z = damp(lidPhys.rot.z, nearest(lidPhys.rot.z, Math.PI * 2), 5, dt);
        }
        lid.position.copy(lidPhys.pos);
        lid.rotation.copy(lidPhys.rot);
        lidContact.position.x = lidPhys.pos.x;
        lidContact.position.z = lidPhys.pos.z;
        lidContactMat.opacity = 0.7 * clamp(1 - (lidPhys.pos.y - FLOOR) / 2);
      }

      // 3) the gift flies, hangs, then settles in front of the viewer
      lastGiftVel.copy(giftPhys.vel);
      if (giftPhys.mode === 'flying') {
        giftPhys.vel.y -= GRAVITY * dt;
        giftPhys.pos.addScaledVector(giftPhys.vel, dt);
        gift.root.rotation.x += giftPhys.spin.x * dt;
        gift.root.rotation.y += giftPhys.spin.y * dt;
        gift.root.rotation.z += giftPhys.spin.z * dt;
        giftPhys.scale = damp(giftPhys.scale, 1, 2.5, dt);
        gift.root.position.copy(giftPhys.pos);
        if (giftPhys.vel.y < -1.5) giftPhys.mode = 'settling';
      } else if (giftPhys.mode !== 'inside') {
        // a slightly underdamped spring toward home
        const k = 26;
        const c = 2 * Math.sqrt(k) * 0.8;
        tmpV.copy(giftHome).sub(giftPhys.pos).multiplyScalar(k).addScaledVector(giftPhys.vel, -c);
        giftPhys.vel.addScaledVector(tmpV, dt);
        giftPhys.pos.addScaledVector(giftPhys.vel, dt);
        giftPhys.scale = damp(giftPhys.scale, 1, 4, dt);
        const pose = g.object === 'ticket' ? { x: -0.12, z: 0.06 } : { x: 0.05, z: 0 };
        gift.root.rotation.x = damp(wrap(gift.root.rotation.x), pose.x + Math.sin(t * 0.9) * 0.04 + lean.y * 0.12, 3, dt);
        gift.root.rotation.z = damp(wrap(gift.root.rotation.z), pose.z + Math.sin(t * 0.7) * 0.03 - lean.x * 0.1, 3, dt);
        drag.v *= Math.exp(-2.2 * realDt);
        if (!drag.on) drag.yaw += drag.v;
        // the ticket sways to keep its face to the viewer, the others turn slowly
        const yaw = g.object === 'ticket' ? Math.sin(t * 0.6) * 0.45 : t * 0.35;
        const targetYaw = yaw + drag.yaw;
        gift.root.rotation.y = damp(targetYaw + wrap(gift.root.rotation.y - targetYaw), targetYaw, 2, dt);
        const hover = giftPhys.mode === 'home' ? Math.sin(t * 1.4) * 0.05 : 0;
        gift.root.position.set(giftPhys.pos.x, giftPhys.pos.y + hover, giftPhys.pos.z);
        if (giftPhys.mode === 'settling' && giftPhys.pos.distanceTo(giftHome) < 0.25 && giftPhys.vel.length() < 0.6) {
          giftPhys.mode = 'home';
          state.mode = 'revealed';
          showLink();
        }
      }
      if (giftPhys.mode !== 'inside') {
        gift.root.scale.setScalar(giftPhys.scale);
        giftAccel.copy(giftPhys.vel).sub(lastGiftVel).divideScalar(Math.max(dt, 1e-4));
      }
      framing = damp(framing, giftPhys.mode === 'inside' ? 0 : 1, 2.2, realDt);

      // 4) glints fall and fade
      if (glints.material.opacity > 0) {
        const pos = glints.geometry.attributes.position;
        for (let i = 0; i < GN; i++) {
          glintVel[i].y -= GRAVITY * 0.6 * dt;
          pos.setXYZ(i, pos.getX(i) + glintVel[i].x * dt, Math.max(FLOOR + 0.02, pos.getY(i) + glintVel[i].y * dt), pos.getZ(i) + glintVel[i].z * dt);
        }
        pos.needsUpdate = true;
        glints.material.opacity = Math.max(0, glints.material.opacity - realDt * 0.6);
      }
    }
    gift.update(realDt, giftAccel);
    giftAccel.multiplyScalar(0);

    contact.position.x = cap.position.x;
    contact.position.z = cap.position.z;
    contactMat.opacity = 0.85 * clamp(1 - cap.position.y / 2.5);
    placeCamera(realDt);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);

  // ?debug exposes the scene for automated checks
  if (new URLSearchParams(location.search).has('debug')) window.__juhulia = { state, cap, body, gift, giftPhys, lidPhys, camera };
}
