// A translucent gacha capsule in a studio tinted to its own colour, with glitter
// in the air. It arrives its own way, waits (something knocks inside, the light
// wanders, it leans toward the finger), and when touched it bursts open: the lid
// flies off, the gift jumps out, hangs in slow motion and settles in front of the
// viewer, where it keeps living. Then its link appears.
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

// A four-pointed glint: a soft core with two thin crossing rays.
const starTexture = () =>
  canvasTexture(128, 128, (g) => {
    const core = g.createRadialGradient(64, 64, 0, 64, 64, 22);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, 128, 128);
    const ray = (horizontal) => {
      const grd = horizontal ? g.createLinearGradient(0, 64, 128, 64) : g.createLinearGradient(64, 0, 64, 128);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      if (horizontal) g.fillRect(0, 62, 128, 4);
      else g.fillRect(62, 0, 4, 128);
    };
    ray(true);
    ray(false);
  });

// Light refracted through coloured plastic: a soft pool crossed by bright wavy lines.
const causticTexture = () =>
  canvasTexture(256, 256, (g, w, h) => {
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineCap = 'round';
    for (let i = 0; i < 36; i++) {
      g.lineWidth = rand(1.5, 4.5);
      g.beginPath();
      const x = rand(0, w);
      const y = rand(0, h);
      g.moveTo(x, y);
      g.bezierCurveTo(x + rand(-60, 60), y + rand(-60, 60), x + rand(-60, 60), y + rand(-60, 60), x + rand(-70, 70), y + rand(-70, 70));
      g.stroke();
    }
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.6, 'rgba(0,0,0,0.6)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = mask;
    g.fillRect(0, 0, w, h);
  });

/* ---------- glitter: twinkling stars drawn as soft points ---------- */

function starPoints(n, map) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(n), 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uMap: { value: map }, uTime: { value: 0 }, uScale: { value: 300 }, uBoost: { value: 0 }, uTwinkle: { value: 1 }, uGain: { value: 1 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute float aPhase;
      uniform float uTime; uniform float uScale; uniform float uBoost; uniform float uTwinkle; uniform float uGain;
      varying vec3 vColor; varying float vAlpha; varying float vRot;
      void main() {
        float tw = pow(0.5 + 0.5 * sin(uTime * (1.2 + fract(aPhase * 7.3) * 2.6) + aPhase * 6.2831), 5.0);
        float k = mix(1.0, 0.25 + 1.4 * tw, uTwinkle);
        vColor = aColor;
        vAlpha = aAlpha * k * (uGain + uBoost * 1.5);
        vRot = aPhase * 3.0 + uTime * 0.3;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(aSize * (0.7 + 0.6 * k + uBoost) * uScale / max(-mv.z, 0.5), 110.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying vec3 vColor; varying float vAlpha; varying float vRot;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float c = cos(vRot), s = sin(vRot);
        p = mat2(c, -s, s, c) * p + 0.5;
        vec4 tex = texture2D(uMap, p);
        gl_FragColor = vec4(vColor * tex.a * vAlpha, 1.0);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

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

const FONT = '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif';

/* ---------- liquid: a level surface that sloshes, drawn by clipping a volume ---------- */

// The liquid is a closed volume clipped by a plane that stays level with the world
// and wobbles on a spring when its container moves or turns. Faces seen from inside
// the volume are drawn flat in the surface colour, so the cut reads as a surface.
class Liquid {
  constructor(geometry, { color, top, fill, center = new THREE.Vector3() }) {
    this.localCenter = center;
    this.fill = fill; // height of the surface above the centre, in local units
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTop: { value: new THREE.Color(top) },
        uCenter: { value: new THREE.Vector3() },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uFill: { value: 0 },
        uScale: { value: 1 },
        uTime: { value: 0 },
        uChurn: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorld; varying vec3 vNormal;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform vec3 uTop; uniform vec3 uCenter; uniform vec3 uUp;
        uniform float uFill; uniform float uScale; uniform float uTime; uniform float uChurn;
        varying vec3 vWorld; varying vec3 vNormal;
        void main() {
          vec3 p = (vWorld - uCenter) / uScale;
          float ripple = (sin(p.x * 23.0 + uTime * 3.1) + sin(p.z * 19.0 - uTime * 2.7)) * (0.006 + 0.03 * uChurn);
          float h = dot(p, uUp);
          if (h > uFill + ripple) discard;
          vec3 col;
          if (!gl_FrontFacing) {
            // the surface, seen through the cut
            col = uTop * (0.85 + 0.15 * sin(p.x * 31.0 + p.z * 17.0 + uTime * 2.0));
          } else {
            vec3 N = normalize(vNormal);
            vec3 V = normalize(cameraPosition - vWorld);
            float diff = 0.55 + 0.45 * max(dot(N, normalize(vec3(0.3, 1.0, 0.6))), 0.0);
            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            float meniscus = smoothstep(uFill - 0.05, uFill, h);
            col = uColor * diff + uTop * (fres * 0.6 + meniscus * 0.35);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.wobble = { x: 0, z: 0, vx: 0, vz: 0 };
    this.last = new THREE.Vector3();
    this.lastVel = new THREE.Vector3();
    this.lastUp = new THREE.Vector3(0, 1, 0);
    this.first = true;
    this.t = 0;
    this._c = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this._a = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  // a push from outside, e.g. a deliberate swirl of the glass
  nudge(x, z) {
    this.wobble.vx += x;
    this.wobble.vz += z;
  }

  update(dt) {
    if (dt <= 0) return;
    this.t += dt;
    const m = this.mesh;
    m.updateWorldMatrix(true, false);
    const c = this._c.copy(this.localCenter).applyMatrix4(m.matrixWorld);
    const scale = this._s.setFromMatrixScale(m.matrixWorld).x;
    const up = this._up.set(0, 1, 0).transformDirection(m.matrixWorld);
    if (this.first) {
      this.last.copy(c);
      this.lastUp.copy(up);
      this.first = false;
    }
    // acceleration of the container and how fast it turns both push the liquid
    const v = this._v.copy(c).sub(this.last).divideScalar(dt);
    const a = this._a.copy(v).sub(this.lastVel).divideScalar(dt);
    const turn = this.lastUp.clone().sub(up).divideScalar(dt);
    this.last.copy(c);
    this.lastVel.copy(v);
    this.lastUp.copy(up);
    const w = this.wobble;
    const push = clamp(1 / Math.max(scale, 0.2), 0, 4);
    w.vx += (-a.x * 0.012 * push + turn.x * 0.25 - w.x * 70) * dt;
    w.vz += (-a.z * 0.012 * push + turn.z * 0.25 - w.z * 70) * dt;
    w.vx *= Math.exp(-2.6 * dt);
    w.vz *= Math.exp(-2.6 * dt);
    w.x = clamp(w.x + w.vx * dt, -0.6, 0.6);
    w.z = clamp(w.z + w.vz * dt, -0.6, 0.6);
    const u = this.material.uniforms;
    u.uCenter.value.copy(c);
    u.uUp.value.set(w.x, 1, w.z).normalize();
    u.uFill.value = this.fill;
    u.uScale.value = scale;
    u.uTime.value = this.t;
    u.uChurn.value = clamp(Math.hypot(w.vx, w.vz) * 0.5);
  }
}

// zense: a perfume flacon with sloshing amber juice; now and then it sprays a glittering mist.
function makeFlacon() {
  const root = new THREE.Group();
  const g = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(0.95, 1.05, 0.12), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 16 });
  bodyGeo.center();
  const body = new THREE.Mesh(bodyGeo, glassMaterial({ thickness: 0.3, color: 0xf4f1ea, envMapIntensity: 2 }));
  const juiceGeo = new THREE.ExtrudeGeometry(roundedRect(0.8, 0.9, 0.09), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  juiceGeo.center();
  const juice = new Liquid(juiceGeo, { color: 0xb8691a, top: 0xf2b45a, fill: 0.12 });
  juice.mesh.position.y = -0.04;
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
  const nozzle = new THREE.Object3D();
  nozzle.position.set(0, 1.0, 0.25);
  g.add(body, juice.mesh, collar, cap, label, nozzle);
  root.add(g);
  let next = 1.2;
  const at = new THREE.Vector3();
  const cloud = { left: 0, wait: 0, a: 0 };
  return {
    root,
    update(dt) {
      juice.update(dt);
    },
    // easter egg: a whole cloud of scent, sprayed once around in a circle
    egg(fx, ctx) {
      cloud.left = 10;
      cloud.wait = 0;
      cloud.a = 0;
      ctx.boost(1);
    },
    // a press on the cap, then a puff of glitter
    life(t, dt, fx) {
      if (cloud.left > 0) {
        cloud.wait -= dt;
        if (cloud.wait <= 0) {
          cloud.left -= 1;
          cloud.wait = 0.22;
          cloud.a += Math.PI / 5;
          gsap.fromTo(cap.position, { y: 0.86 }, { y: 0.92, duration: 0.2, ease: 'power3.out' });
          juice.nudge(rand(-1, 1), rand(-1, 1));
          nozzle.getWorldPosition(at);
          const dir = new THREE.Vector3(Math.cos(cloud.a), 0.5, Math.sin(cloud.a));
          fx.emit(at, 45, { dir, speed: 3, spread: 0.45, gravity: -0.1, drag: 1.6, swirl: 2, life: 2.6, size: 0.12 });
        }
        return;
      }
      next -= dt;
      if (next > 0) return;
      next = rand(3.2, 5.2);
      gsap.fromTo(cap.position, { y: 0.86 }, { y: 0.92, duration: 0.5, ease: 'power3.out' });
      juice.nudge(rand(-0.6, 0.6), rand(-0.6, 0.6));
      nozzle.getWorldPosition(at);
      const dir = new THREE.Vector3(0.2, 0.35, 1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
      fx.emit(at, 38, { dir, speed: 2.2, spread: 0.55, gravity: -0.15, drag: 2.2, life: 1.8, size: 0.09 });
    },
  };
}

// Henne.: a stemmed glass of red wine; it swirls now and then and the wine follows.
function makeWineGlass() {
  const root = new THREE.Group();
  const g = new THREE.Group();
  const prof = [
    [0.0, 0], [0.4, 0], [0.42, 0.015], [0.4, 0.03], [0.08, 0.06], [0.04, 0.12], [0.032, 0.5], [0.034, 0.74],
    [0.07, 0.8], [0.2, 0.86], [0.31, 0.96], [0.37, 1.12], [0.38, 1.3], [0.36, 1.48], [0.33, 1.62],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glassMaterial({ side: THREE.DoubleSide, thickness: 0.08 }));
  // the wine's volume: the inside of the bowl, closed at the bottom
  const wprof = [[0.0, 0.83], [0.07, 0.83], [0.19, 0.88], [0.29, 0.97], [0.355, 1.12], [0.365, 1.3], [0.35, 1.46], [0.0, 1.46]].map(([x, y]) => new THREE.Vector2(x, y));
  const wine = new Liquid(new THREE.LatheGeometry(wprof, 96), { color: 0x4a0410, top: 0x9a1424, fill: 0.02, center: new THREE.Vector3(0, 1.14, 0) });
  g.add(glass, wine.mesh);
  root.add(g);
  // bubbles for the easter egg, rising through the wine
  const BN = 70;
  const bubbleGeo = new THREE.BufferGeometry();
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BN * 3), 3));
  const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ color: 0xffe2e6, size: 0.035, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  bubbles.frustumCulled = false;
  g.add(bubbles);
  const bub = Array.from({ length: BN }, () => ({ y: rand(0.84, 1.12), a: rand(0, Math.PI * 2), r: rand(0, 1), v: rand(0.12, 0.3) }));
  let fizz = 0;
  const swirl = { t: -1 };
  let next = 1.5;
  return {
    root,
    update(dt) {
      wine.update(dt);
      if (fizz <= 0 && bubbles.material.opacity <= 0) return;
      fizz = Math.max(0, fizz - dt);
      bubbles.material.opacity = damp(bubbles.material.opacity, fizz > 0 ? 1 : 0, 3, dt);
      const pos = bubbleGeo.attributes.position;
      bub.forEach((b, i) => {
        b.y += b.v * dt;
        if (b.y > 1.14) b.y = 0.84;
        // stay inside the bowl, which widens as it rises
        const rad = (0.07 + (b.y - 0.83) * 0.95) * b.r;
        pos.setXYZ(i, Math.cos(b.a + b.y * 6) * rad, b.y, Math.sin(b.a + b.y * 6) * rad);
      });
      pos.needsUpdate = true;
      if (fizz > 0 && Math.random() < dt * 4) wine.nudge(rand(-0.15, 0.15), rand(-0.15, 0.15));
    },
    // easter egg: the red starts to sparkle
    egg(fx, ctx) {
      fizz = 7;
      ctx.boost(0.8);
      const at = new THREE.Vector3(0, 1.3, 0);
      g.localToWorld(at);
      fx.emit(at, 50, { dir: new THREE.Vector3(0, 1, 0), spread: 0.4, speed: 2.4, gravity: -0.05, drag: 1.8, life: 2.2, size: 0.08 });
    },
    // a slow swirl of the glass; the wine climbs the wall a beat behind
    life(t, dt) {
      next -= dt;
      if (next <= 0 && swirl.t < 0) {
        swirl.t = 0;
        next = rand(4, 6);
      }
      if (swirl.t >= 0) {
        swirl.t += dt;
        const k = Math.sin(clamp(swirl.t / 1.6) * Math.PI);
        const a = swirl.t * 7;
        g.position.x = Math.cos(a) * 0.05 * k;
        g.position.z = Math.sin(a) * 0.05 * k;
        if (swirl.t > 1.6) {
          swirl.t = -1;
          g.position.set(0, 0, 0);
        }
      }
    },
  };
}

// A carousel horse in profile, prancing, as a thick extruded silhouette.
function horseShape() {
  const s = new THREE.Shape();
  const P = [
    [-0.5, 0.1], [-0.6, -0.02], [-0.66, -0.16], [-0.56, -0.04], [-0.46, 0.06], [-0.3, 0.17], [0.12, 0.17], [0.24, 0.3], [0.3, 0.46],
    [0.34, 0.6], [0.4, 0.5], [0.48, 0.5], [0.62, 0.38], [0.6, 0.31], [0.44, 0.33], [0.32, 0.2], [0.3, 0.02], [0.44, -0.08],
    [0.48, -0.2], [0.42, -0.22], [0.36, -0.12], [0.22, -0.08], [0.17, -0.42], [0.11, -0.42], [0.1, -0.1], [-0.24, -0.1],
    [-0.3, -0.42], [-0.36, -0.42], [-0.4, -0.06],
  ];
  s.moveTo(...P[0]);
  for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1];
    const [x1, y1] = P[i];
    s.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  s.lineTo(...P[0]);
  return s;
}

// Phantasialand: a carousel that turns, its horses rising and falling on their poles.
function makeCarousel(accent) {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const cream = new THREE.MeshPhysicalMaterial({ color: 0xf3eee2, roughness: 0.35, clearcoat: 0.8, envMapIntensity: 1.1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b46a, metalness: 1, roughness: 0.28, envMapIntensity: 1.5 });
  const tint = new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.3, clearcoat: 0.8, envMapIntensity: 1.1 });

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.82, 0.1, 48), cream);
  platform.position.y = 0.05;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.83, 0.83, 0.05, 48), tint);
  skirt.position.y = 0.025;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 24), gold);
  pole.position.y = 0.6;
  // the roof: a striped cone over a scalloped valance
  const roofGeo = new THREE.ConeGeometry(0.92, 0.42, 16, 1).toNonIndexed();
  const colors = [];
  const ca = new THREE.Color(accent);
  const cb = new THREE.Color(0xf3eee2);
  const pos = roofGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const k = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 16) % 2;
    const c = k ? ca : cb;
    for (let j = 0; j < 3; j++) colors.push(c.r, c.g, c.b);
  }
  roofGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 0.8 }));
  roof.position.y = 1.31;
  const valance = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.12, 48, 1, true), tint);
  valance.material.side = THREE.DoubleSide;
  valance.position.y = 1.05;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), gold);
  finial.position.y = 1.56;
  spin.add(platform, skirt, pole, roof, valance, finial);

  // a ring of bulbs along the valance that twinkle
  const bulbs = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd88a, emissiveIntensity: 1 }));
    bulb.position.set(Math.cos(a) * 0.93, 1.0, Math.sin(a) * 0.93);
    spin.add(bulb);
    bulbs.push(bulb);
  }

  // six horses on gold poles
  const horseGeo = new THREE.ExtrudeGeometry(horseShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 6 });
  horseGeo.center();
  const horses = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 0.56;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.9, 8), gold);
    post.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);
    const horse = new THREE.Mesh(horseGeo, i % 2 ? cream : tint);
    horse.scale.setScalar(0.42);
    horse.position.copy(post.position);
    horse.rotation.y = -a; // facing the direction of travel
    spin.add(post, horse);
    horses.push({ horse, phase: i * 1.05 });
  }
  const rush = { v: 0, phase: 0 };
  let fireworks = [];
  return {
    root,
    finalSize: 1.25,
    update(dt) {
      this.t = (this.t || 0) + dt;
      const t = this.t;
      const speed = 1 + rush.v * 4;
      rush.phase += dt * speed;
      spin.rotation.y -= dt * 0.7 * speed;
      horses.forEach(({ horse, phase }) => {
        horse.position.y = 0.55 + Math.sin(rush.phase * 2.2 + phase) * (0.09 + rush.v * 0.05);
        horse.rotation.z = Math.sin(rush.phase * 2.2 + phase + 1.2) * 0.08;
      });
      // the bulbs twinkle; at full speed they chase each other around the roof
      bulbs.forEach((b, i) => {
        const chase = Math.max(0, Math.sin(t * 14 - i * 0.8)) * 2.2;
        b.material.emissiveIntensity = THREE.MathUtils.lerp(0.5 + 0.8 * Math.max(0, Math.sin(t * 3 + i * 0.9)), chase, rush.v);
      });
    },
    // easter egg: the ride goes to full speed, then fireworks rise from the roof
    egg(fx, ctx) {
      gsap.killTweensOf(rush);
      gsap.timeline().to(rush, { v: 1, duration: 0.8, ease: 'power2.in' }).to(rush, { v: 0, duration: 2.2, ease: 'power2.out' }, '+=2');
      fireworks = [0.6, 1.4, 2.1, 2.9].map((at) => ({ at, done: false }));
      this.eggT = 0;
      ctx.boost(1);
    },
    life(t, dt, fx) {
      if (!fireworks.length) return;
      this.eggT += dt;
      const top = new THREE.Vector3();
      finial.getWorldPosition(top);
      fireworks.forEach((f) => {
        if (f.done || this.eggT < f.at) return;
        f.done = true;
        const burstAt = top.clone().add(new THREE.Vector3(rand(-0.6, 0.6), rand(1.2, 1.9), rand(-0.3, 0.3)));
        fx.emit(top, 10, { dir: burstAt.clone().sub(top), spread: 0.1, speed: 5, gravity: 0.4, drag: 2, life: 0.5, size: 0.07 });
        gsap.delayedCall(0.35, () => fx.emit(burstAt, 70, { speed: 3.4, gravity: 0.8, drag: 1.4, life: 1.6, size: 0.11 }));
      });
      if (fireworks.every((f) => f.done)) fireworks = [];
    },
  };
}

const GIFTS = { flacon: makeFlacon, wineglass: makeWineGlass, carousel: makeCarousel };

/* ---------- the page ---------- */

export function start(slug) {
  const g = GACHAS[slug];
  const C = {
    capsule: new THREE.Color(g.color.capsule),
    ground: new THREE.Color(g.color.ground),
    deep: new THREE.Color(g.color.deep),
    glitter: new THREE.Color(g.color.glitter),
  };
  const root = document.querySelector('[data-stage]');
  const canvas = root.querySelector('canvas');
  const button = root.querySelector('[data-open]');
  const hint = root.querySelector('[data-hint]');
  const reveal = root.querySelector('[data-reveal]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const showLink = () => {
    reveal.hidden = false;
    requestAnimationFrame(() => {
      reveal.classList.add('is-visible');
      // the open button is gone; keep keyboard and screen reader users on the next step
      reveal.querySelector('a')?.focus({ preventScroll: true });
    });
  };
  const progress = (p) => window.__juhuliaProgress?.(p);
  // the loading screen leaves only once everything below is ready
  const hideLoader = () =>
    new Promise((resolve) => {
      const el = document.querySelector('[data-loader]');
      if (!el) return resolve();
      el.classList.add('is-done');
      setTimeout(() => el.remove(), reduce ? 0 : 900);
      // the entrance starts while the loading screen is still fading
      setTimeout(resolve, reduce ? 0 : 150);
    });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    // No WebGL: the link is all there is.
    button.remove();
    hint.remove();
    window.__juhuliaReady = true;
    hideLoader().then(showLink);
    return;
  }
  window.__juhuliaReady = true;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(C.deep, 1);
  renderer.useLegacyLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.deep, 14, 34);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const soft = softTexture();
  const star = starTexture();

  // Studio reflections: a big overhead softbox and two strips.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = C.deep.clone().multiplyScalar(0.8);
  const box = (w, h, c, p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...p);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(6, 3, new THREE.Color(3.2, 3.2, 3.1), [0, 6, 1]);
  box(0.6, 6, new THREE.Color(1.6, 1.6, 1.6), [-5, 1, 3]);
  box(0.6, 6, new THREE.Color(1.1, 1.1, 1.15), [5, 1, 2]);
  box(8, 1.2, C.ground.clone().multiplyScalar(2), [0, -3, 4]);
  scene.environment = pmrem.fromScene(env, 0.02).texture;

  /* studio: one seamless sheet in the page's colour, floor curving up into the wall */
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
  const studio = new THREE.Mesh(studioGeo, new THREE.MeshStandardMaterial({ color: C.ground, roughness: 0.82, side: THREE.DoubleSide }));
  studio.receiveShadow = true;
  scene.add(studio);

  /* light: a key that wanders, a rim, a fill */
  const key = new THREE.SpotLight(0xffffff, 2.6, 30, 0.55, 0.9, 1.2);
  key.position.set(0, 7, 3);
  key.target.position.set(0, FLOOR, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 8;
  key.shadow.bias = -0.0004;
  const rim = new THREE.DirectionalLight(C.glitter, 0.8);
  rim.position.set(-4, 3, -6);
  const fill = new THREE.HemisphereLight(0xffffff, C.deep, 0.35);
  const flash = new THREE.PointLight(C.capsule, 0, 8, 2);
  flash.position.set(0, 0.4, 1);
  scene.add(key, key.target, rim, fill, flash);

  // A searchlight from high on the left: it sweeps, and once the gift is out it keeps
  // finding it. Its pool on the wall behind is what makes the glass light up.
  const seeker = new THREE.SpotLight(0xfff4e2, 4.2, 40, 0.15, 0.45, 1.1);
  seeker.position.set(-5.5, 8, 7);
  scene.add(seeker, seeker.target);
  const beamGeo = new THREE.CylinderGeometry(0.04, 1, 1, 48, 1, true);
  beamGeo.translate(0, -0.5, 0);
  beamGeo.rotateX(-Math.PI / 2); // apex at the origin, pointing along +z
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0xfff1d8) }, uOpacity: { value: 0.16 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv; vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float along = 0.2 + 0.8 * vUv.y;
        gl_FragColor = vec4(uColor * edge * along * uOpacity, 1.0);
      }`,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  scene.add(beam);
  const seekAim = new THREE.Vector3();
  const seekLock = { v: 0, hold: 0 };

  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ map: soft, color: C.ground.clone().multiplyScalar(0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = FLOOR + 0.003;
  scene.add(pool);

  /* coloured light the capsule throws onto the floor */
  const glowMat = new THREE.MeshBasicMaterial({ map: soft, color: C.capsule.clone().multiplyScalar(0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = FLOOR + 0.007;
  const causticMat = new THREE.MeshBasicMaterial({ map: causticTexture(), color: C.capsule.clone().lerp(new THREE.Color(1, 1, 1), 0.2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const caustic = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), causticMat);
  caustic.rotation.x = -Math.PI / 2;
  caustic.position.y = FLOOR + 0.008;
  scene.add(glow, caustic);

  /* glitter in the air, in two colours and many depths */
  const GF = 560;
  const field = starPoints(GF, star);
  {
    const pos = field.geometry.attributes.position;
    const col = field.geometry.attributes.aColor;
    const size = field.geometry.attributes.aSize;
    const alpha = field.geometry.attributes.aAlpha;
    const phase = field.geometry.attributes.aPhase;
    const white = new THREE.Color(1, 0.97, 0.9);
    const c = new THREE.Color();
    for (let i = 0; i < GF; i++) {
      let x;
      let y;
      let z;
      do {
        x = rand(-9, 9);
        y = rand(FLOOR + 0.2, 8.5);
        z = rand(-14, 3);
      } while (Math.hypot(x, z - 0.6) < 1.8 && y < 2.4); // keep the capsule clear
      pos.setXYZ(i, x, y, z);
      c.copy(C.glitter).lerp(white, Math.random() < 0.4 ? 0.85 : rand(0, 0.35));
      col.setXYZ(i, c.r, c.g, c.b);
      size.setX(i, rand(0.16, 0.48) * (Math.random() < 0.1 ? 1.8 : 1));
      alpha.setX(i, rand(0.6, 1.4));
      phase.setX(i, Math.random());
    }
  }
  scene.add(field);

  /* sparkles thrown by events: the burst, the flacon's puffs, a tap on the gift */
  const SN = 360;
  const sparks = starPoints(SN, star);
  sparks.material.uniforms.uTwinkle.value = 0.6;
  const sp = {
    pos: sparks.geometry.attributes.position,
    col: sparks.geometry.attributes.aColor,
    size: sparks.geometry.attributes.aSize,
    alpha: sparks.geometry.attributes.aAlpha,
    vel: Array.from({ length: SN }, () => new THREE.Vector3()),
    age: new Float32Array(SN).fill(1),
    life: new Float32Array(SN).fill(1),
    base: new Float32Array(SN),
    gravity: new Float32Array(SN),
    drag: new Float32Array(SN),
    swirl: new Float32Array(SN),
    next: 0,
  };
  for (let i = 0; i < SN; i++) sparks.geometry.attributes.aPhase.setX(i, Math.random());
  scene.add(sparks);
  const sparkColor = new THREE.Color();
  const white = new THREE.Color(1, 0.98, 0.94);
  const fx = {
    emit(at, count, o = {}) {
      const dir = o.dir ? o.dir.clone().normalize() : null;
      for (let k = 0; k < count; k++) {
        const i = sp.next;
        sp.next = (sp.next + 1) % SN;
        sp.pos.setXYZ(i, at.x + rand(-0.08, 0.08), at.y + rand(-0.08, 0.08), at.z + rand(-0.08, 0.08));
        const v = sp.vel[i];
        if (dir) v.copy(dir).add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(o.spread ?? 0.5)).normalize();
        else v.set(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize();
        v.multiplyScalar((o.speed ?? 3) * rand(0.45, 1.1));
        sp.age[i] = 0;
        sp.life[i] = (o.life ?? 1.6) * rand(0.7, 1.2);
        sp.gravity[i] = o.gravity ?? 1;
        sp.drag[i] = o.drag ?? 1.2;
        sp.swirl[i] = o.swirl ?? 0;
        sp.base[i] = rand(0.6, 1);
        sp.size.setX(i, (o.size ?? 0.12) * rand(0.6, 1.4));
        sparkColor.copy(C.glitter).lerp(white, rand(0, 0.7));
        sp.col.setXYZ(i, sparkColor.r, sparkColor.g, sparkColor.b);
      }
      sp.col.needsUpdate = true;
      sp.size.needsUpdate = true;
    },
    update(dt) {
      for (let i = 0; i < SN; i++) {
        if (sp.age[i] >= sp.life[i]) {
          sp.alpha.setX(i, 0);
          continue;
        }
        sp.age[i] += dt;
        const v = sp.vel[i];
        let x = sp.pos.getX(i);
        let y = sp.pos.getY(i);
        let z = sp.pos.getZ(i);
        if (sp.swirl[i]) {
          // circle around the capsule's axis
          const r = Math.hypot(x, z) + 1e-3;
          v.x += (-z / r) * sp.swirl[i] * dt;
          v.z += (x / r) * sp.swirl[i] * dt;
        }
        v.y -= GRAVITY * 0.25 * sp.gravity[i] * dt;
        v.multiplyScalar(Math.exp(-sp.drag[i] * dt));
        x += v.x * dt;
        y = Math.max(FLOOR + 0.02, y + v.y * dt);
        z += v.z * dt;
        sp.pos.setXYZ(i, x, y, z);
        const k = sp.age[i] / sp.life[i];
        sp.alpha.setX(i, sp.base[i] * Math.min(1, k * 8) * (1 - k) * (1 - k));
      }
      sp.pos.needsUpdate = true;
      sp.alpha.needsUpdate = true;
    },
  };

  /* the capsule: translucent coloured plastic, like the real ones */
  const cap = new THREE.Group(); // entrance motion
  scene.add(cap);
  const body = new THREE.Group(); // tilt, knocks, trembling
  cap.add(body);
  const lid = new THREE.Group();
  body.add(lid);
  const plastic = (transmission, roughness) =>
    new THREE.MeshPhysicalMaterial({
      color: C.capsule,
      roughness,
      transmission,
      thickness: 0.32,
      ior: 1.46,
      attenuationColor: C.capsule,
      attenuationDistance: 1.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
      emissive: C.capsule,
      emissiveIntensity: 0.1,
      envMapIntensity: 1.3,
      side: THREE.DoubleSide,
    });
  const top = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), plastic(0.78, 0.34));
  top.castShadow = true;
  lid.add(top);
  const base = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), plastic(0.62, 0.4));
  base.castShadow = true;
  body.add(base);
  // the rims where the halves meet, slightly proud of the surface
  const rimMat = new THREE.MeshPhysicalMaterial({ color: C.capsule, roughness: 0.3, clearcoat: 0.6, emissive: C.capsule, emissiveIntensity: 0, envMapIntensity: 1.1 });
  const baseRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 12, 160), rimMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = -0.012;
  body.add(baseRim);
  const lidRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.022, 12, 160), rimMat);
  lidRim.rotation.x = Math.PI / 2;
  lidRim.position.y = 0.012;
  lid.add(lidRim);
  // two small square hinge tabs at the back, and air holes in the lid
  const tabGeo = new THREE.BoxGeometry(0.16, 0.1, 0.07);
  [-0.32, 0.32].forEach((a) => {
    const tab = new THREE.Mesh(tabGeo, rimMat);
    tab.position.set(Math.sin(Math.PI + a) * 1.02, -0.03, Math.cos(Math.PI + a) * 1.02);
    tab.lookAt(0, -0.03, 0);
    body.add(tab);
  });
  const holeMat = new THREE.MeshBasicMaterial({ color: C.capsule.clone().multiplyScalar(0.25), transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const holeGeo = new THREE.CircleGeometry(0.035, 20);
  [[0.38, 0.3], [0.38, 1.6], [0.38, 2.9], [0.38, 4.2], [0.38, 5.5], [0.12, 0.9]].forEach(([theta, phi]) => {
    const hole = new THREE.Mesh(holeGeo, holeMat);
    const n = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
    hole.position.copy(n).multiplyScalar(1.004);
    hole.lookAt(n.clone().multiplyScalar(2));
    lid.add(hole);
  });

  const contactMat = new THREE.MeshBasicMaterial({ map: soft, color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false });
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

  /* the gift, visible inside the coloured plastic */
  const gift = GIFTS[g.object](C.capsule);
  // centre the gift on its own bounds and size it from them, so that inside the
  // capsule it always fits (bounding sphere well within the shell's radius of 1)
  const giftBox = new THREE.Box3().setFromObject(gift.root);
  const giftCentre = giftBox.getCenter(new THREE.Vector3());
  gift.root.children.forEach((c) => c.position.sub(giftCentre));
  const giftRadius = giftBox.getSize(new THREE.Vector3()).length() / 2;
  const giftScaleInside = 0.8 / giftRadius;
  const giftScaleOut = (gift.finalSize ?? 1.15) / giftRadius;
  gift.root.scale.setScalar(giftScaleInside);
  gift.root.position.set(0, 0, 0);
  gift.root.traverse((o) => (o.castShadow = true));
  body.add(gift.root);

  /* ---------- framing ---------- */

  let dist = 14;
  let framing = 0; // 0 = the capsule, 1 = the gift
  const look = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const shake = new THREE.Vector3();

  // half the width the camera sees at the capsule's depth
  const visibleHalfWidth = () => {
    const d = Math.max(1, camera.position.z);
    return d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  };

  // Quality steps down on its own when frames get slow: resolution first, then
  // shadow detail, then the amount of glitter. It never steps back up mid-visit.
  const quality = {
    tier: 0,
    frames: 0,
    sum: 0,
    cooldown: 2,
    sample(dt) {
      if (!dt) return;
      this.cooldown -= dt;
      this.frames++;
      this.sum += dt;
      if (this.frames < 60) return;
      const fps = this.frames / this.sum;
      this.frames = 0;
      this.sum = 0;
      if (fps >= 45 || this.cooldown > 0 || this.tier >= 3) return;
      this.tier++;
      this.cooldown = 2;
      const dpr = window.devicePixelRatio || 1;
      if (this.tier === 1) renderer.setPixelRatio(Math.min(dpr, 1.5));
      if (this.tier === 2) {
        renderer.setPixelRatio(Math.min(dpr, 1.15));
        key.shadow.mapSize.set(512, 512);
        key.shadow.map?.dispose();
        key.shadow.map = null;
        field.geometry.setDrawRange(0, Math.round(GF * 0.6));
      }
      if (this.tier === 3) {
        renderer.setPixelRatio(1);
        key.castShadow = false;
        field.geometry.setDrawRange(0, Math.round(GF * 0.35));
      }
      fit();
    },
  };

  const fit = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max(2 / 0.52 / (2 * tan * camera.aspect), 2 / 0.34 / (2 * tan));
    const scale = h * renderer.getPixelRatio() * 0.5;
    field.material.uniforms.uScale.value = scale;
    sparks.material.uniforms.uScale.value = scale;
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

  /* ---------- the capsule leans toward the finger or the pointer ---------- */

  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    lean.tx = (e.clientX / window.innerWidth) * 2 - 1;
    lean.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });

  /* ---------- state ---------- */

  const state = { mode: 'entering', queued: false, sim: 0, timeScale: 1, burst: false };
  const knock = { vx: 0, vz: 0, x: 0, z: 0, hop: 0, hopV: 0 };
  const lidPhys = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), rest: false };
  const giftPhys = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), mode: 'inside', scale: giftScaleInside };
  const giftHome = new THREE.Vector3(0, 1.35, 1.4);
  const giftAccel = new THREE.Vector3();
  const lastGiftVel = new THREE.Vector3();
  const drag = { on: false, x: 0, y: 0, v: 0, yaw: 0, moved: 0, t0: 0 };
  const glitterBoost = { v: 0 };

  /* ---------- entrances ---------- */

  const squash = (amt) => {
    if (reduce) return;
    gsap.fromTo(cap.scale, { y: 1 - amt, x: 1 + amt * 0.6, z: 1 + amt * 0.6 }, { y: 1, x: 1, z: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  };
  const landing = (strength) => {
    squash(0.16 * strength);
    kick(0.12 * strength);
    fx.emit(new THREE.Vector3(cap.position.x, FLOOR + 0.05, cap.position.z), Math.round(30 * strength), { speed: 2.4, gravity: 0.6, life: 1.2, size: 0.09 });
  };

  const entrances = {
    // Falls out of the dark, lands hard, one rebound, settles.
    drop() {
      cap.position.set(0, 9, 0);
      cap.rotation.set(0.1, -1.2, 0);
      return gsap
        .timeline({ onComplete: settle, paused: true })
        .to(cap.position, { y: 0, duration: 0.8, ease: 'power2.in' })
        .add(() => landing(1))
        .to(cap.position, { y: 0.42, duration: 0.24, ease: 'power2.out' })
        .to(cap.position, { y: 0, duration: 0.24, ease: 'power2.in' })
        .add(() => landing(0.35))
        .to(cap.rotation, { y: 0.35, x: 0, duration: 1.6, ease: 'power3.out' }, 0);
    },
    // Rolls out of the depth of the studio and comes to rest, rocking.
    roll() {
      const Z = -16;
      cap.position.set(0, 0, Z);
      cap.rotation.set(Z, 0.3, 0); // a rolling sphere turns by distance / radius
      return gsap
        .timeline({ onComplete: settle, paused: true })
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
        .timeline({ onComplete: settle, paused: true })
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
        .add(() => landing(0.9))
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
    lidPhys.vel.set(side * rand(1.3, 1.7), rand(5.2, 6), rand(-2.6, -2));
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
    giftPhys.spin.set(2.5, 7.5, 0.6);
    giftPhys.mode = 'flying';

    // glitter bursts out and swirls around the opening
    const at = new THREE.Vector3(cap.position.x, 0.1, cap.position.z);
    fx.emit(at, 140, { speed: 5, gravity: 0.5, drag: 1.4, swirl: 6, life: 2.6, size: 0.14 });
    fx.emit(at, 60, { dir: new THREE.Vector3(0, 1, 0.2), spread: 0.35, speed: 7, gravity: 0.7, drag: 1, life: 2.2, size: 0.1 });
    gsap.fromTo(glitterBoost, { v: 1 }, { v: 0, duration: 2.4, ease: 'power2.out' });
    gsap.fromTo(flash, { intensity: 5 }, { intensity: 0, duration: 0.9, ease: 'power2.out' });
    kick(0.16, 0.6);
    squash(0.12);
  }

  /* ---------- once revealed: drag to turn the gift, tap to make it spin and sparkle ---------- */

  const ray = new THREE.Raycaster();
  let taps = [];
  const ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'revealed') return;
    Object.assign(drag, { on: true, x: e.clientX, y: e.clientY, v: 0, moved: 0, t0: performance.now() });
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag.on) return;
    const dx = e.clientX - drag.x;
    drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.v = dx * 0.012;
    drag.yaw += drag.v;
  });
  const endDrag = (e) => {
    if (!drag.on) return;
    drag.on = false;
    if (drag.moved > 10 || performance.now() - drag.t0 > 350) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.intersectObject(gift.root, true).length) return;
    // three quick taps on the gift wake its easter egg
    const nowT = performance.now();
    taps = taps.filter((x) => nowT - x < 1200);
    taps.push(nowT);
    if (taps.length >= 3 && gift.egg) {
      taps = [];
      gift.egg(fx, { boost: (v) => gsap.fromTo(glitterBoost, { v }, { v: 0, duration: 2.6, ease: 'power2.out' }) });
    }
    drag.v += 0.5;
    giftPhys.vel.y += 3;
    const at = new THREE.Vector3();
    gift.root.getWorldPosition(at);
    fx.emit(at, 60, { speed: 3.2, gravity: 0.3, drag: 2, swirl: 3, life: 1.8, size: 0.11 });
    gsap.fromTo(glitterBoost, { v: 0.6 }, { v: 0, duration: 1.6, ease: 'power2.out' });
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => (drag.on = false));

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

    // the key light wanders slowly; highlights travel over the plastic
    // the searchlight: a restless sweep, locking on the gift now and then once it is out
    {
      const out = giftPhys.mode === 'home';
      seekLock.hold -= realDt;
      if (out && seekLock.hold <= 0) {
        seekLock.hold = rand(4, 7);
        gsap.to(seekLock, { v: 1, duration: 0.9, ease: 'power2.inOut', yoyo: true, repeat: 1, repeatDelay: rand(1.4, 2.4) });
      }
      const sx = Math.sin(t * 0.47) * 2.6 + Math.sin(t * 1.13) * 0.6;
      const sy = 0.4 + Math.sin(t * 0.71) * 0.6;
      seekAim.set(sx, sy, 0.3);
      if (out) seekAim.lerp(gift.root.position, seekLock.v);
      else seekAim.lerp(cap.position, 0.25);
      seeker.target.position.lerp(seekAim, 1 - Math.exp(-4 * realDt));
      const len = seeker.position.distanceTo(seeker.target.position) + 6;
      const r = Math.tan(seeker.angle) * len;
      beam.position.copy(seeker.position);
      beam.lookAt(seeker.target.position);
      beam.scale.set(r, r, len);
      beamMat.uniforms.uOpacity.value = 0.12 + seekLock.v * 0.08;
    }
    key.position.x = Math.sin(t * 0.22) * 3.2;
    key.position.z = 3 + Math.cos(t * 0.17) * 1.2;
    pool.position.x = key.position.x * 0.15;

    lean.x = damp(lean.x, lean.tx, 2.5, realDt);
    lean.y = damp(lean.y, lean.ty, 2.5, realDt);

    // glitter: twinkle, drift a little with the lean (parallax), flare on events
    field.material.uniforms.uTime.value = t;
    field.material.uniforms.uBoost.value = glitterBoost.v;
    // quieter in the background; events still make it flare
    field.material.uniforms.uGain.value = 0.62;
    field.position.x = -lean.x * 0.5;
    field.position.y = lean.y * 0.25;
    field.rotation.y = Math.sin(t * 0.05) * 0.04;
    sparks.material.uniforms.uTime.value = t;

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
      gift.root.position.set(knock.z * 0.04, knock.hop * 0.12, -knock.x * 0.04);
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

      // 1) anticipation: the capsule trembles harder and harder, the rims glow
      if (!state.burst) {
        const k = clamp(s / 0.9);
        body.rotation.set(Math.sin(s * 47) * 0.05 * k, 0, Math.sin(s * 53 + 1) * 0.07 * k);
        body.position.y = Math.abs(Math.sin(s * 31)) * 0.04 * k;
        rimMat.emissiveIntensity = k * k * 1.6;
        glowMat.opacity = 1 + k;
        if (s >= 0.9) {
          body.rotation.set(0, 0, 0);
          body.position.y = 0;
          rimMat.emissiveIntensity = 0;
          burst();
        }
      }

      // 2) the lid tumbles, bounces and comes to rest dome-up on the floor
      if (state.burst) {
        if (!lidPhys.rest) {
          lidPhys.vel.y -= GRAVITY * dt;
          lidPhys.pos.addScaledVector(lidPhys.vel, dt);
          const edge = Math.max(1.4, visibleHalfWidth() - 1.05);
          if (Math.abs(lidPhys.pos.x) > edge) {
            lidPhys.pos.x = Math.sign(lidPhys.pos.x) * edge;
            lidPhys.vel.x *= -0.3;
          }
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
        lidContactMat.opacity = 0.65 * clamp(1 - (lidPhys.pos.y - FLOOR) / 2);
        glowMat.opacity = damp(glowMat.opacity, 0.6, 2, dt);
      }

      // 3) the gift flies, hangs, then settles in front of the viewer
      lastGiftVel.copy(giftPhys.vel);
      if (giftPhys.mode === 'flying') {
        giftPhys.vel.y -= GRAVITY * dt;
        giftPhys.pos.addScaledVector(giftPhys.vel, dt);
        gift.root.rotation.x += giftPhys.spin.x * dt;
        gift.root.rotation.y += giftPhys.spin.y * dt;
        gift.root.rotation.z += giftPhys.spin.z * dt;
        giftPhys.scale = damp(giftPhys.scale, giftScaleOut, 2.5, dt);
        gift.root.position.copy(giftPhys.pos);
        if (giftPhys.vel.y < -1.5) giftPhys.mode = 'settling';
      } else if (giftPhys.mode !== 'inside') {
        // a slightly underdamped spring toward home
        const k = 26;
        const c = 2 * Math.sqrt(k) * 0.8;
        tmpV.copy(giftHome).sub(giftPhys.pos).multiplyScalar(k).addScaledVector(giftPhys.vel, -c);
        giftPhys.vel.addScaledVector(tmpV, dt);
        giftPhys.pos.addScaledVector(giftPhys.vel, dt);
        giftPhys.scale = damp(giftPhys.scale, giftScaleOut, 4, dt);
        const pose = g.object === 'carousel' ? { x: 0.16, z: 0 } : { x: 0.05, z: 0 };
        gift.root.rotation.x = damp(wrap(gift.root.rotation.x), pose.x + Math.sin(t * 0.9) * 0.04 + lean.y * 0.12, 3, dt);
        gift.root.rotation.z = damp(wrap(gift.root.rotation.z), pose.z + Math.sin(t * 0.7) * 0.03 - lean.x * 0.1, 3, dt);
        drag.v *= Math.exp(-2.2 * realDt);
        if (!drag.on) drag.yaw += drag.v;
        // the carousel turns by itself; the others turn slowly on the spot
        const yaw = g.object === 'carousel' ? 0 : t * 0.35;
        const targetYaw = yaw + drag.yaw;
        gift.root.rotation.y = damp(targetYaw + wrap(gift.root.rotation.y - targetYaw), targetYaw, 2, dt);
        const hover = giftPhys.mode === 'home' ? Math.sin(t * 1.4) * 0.05 : 0;
        gift.root.position.set(giftPhys.pos.x, giftPhys.pos.y + hover, giftPhys.pos.z);
        if (giftPhys.mode === 'settling' && giftPhys.pos.distanceTo(giftHome) < 0.25 && giftPhys.vel.length() < 0.6) {
          giftPhys.mode = 'home';
          state.mode = 'revealed';
          showLink();
        }
        if (giftPhys.mode === 'home') gift.life(t, realDt, fx);
      }
      if (giftPhys.mode !== 'inside') {
        gift.root.scale.setScalar(giftPhys.scale);
        giftAccel.copy(giftPhys.vel).sub(lastGiftVel).divideScalar(Math.max(dt, 1e-4));
      }
      framing = damp(framing, giftPhys.mode === 'inside' ? 0 : 1, 2.2, realDt);
    }
    gift.update(realDt * state.timeScale, giftAccel);
    giftAccel.multiplyScalar(0);
    fx.update(realDt * state.timeScale);

    // the coloured light under the capsule shimmers like light through plastic
    glow.position.x = cap.position.x;
    glow.position.z = cap.position.z + 0.15;
    caustic.position.x = cap.position.x + 0.1;
    caustic.position.z = cap.position.z + 0.25;
    caustic.rotation.z = t * 0.07;
    caustic.scale.setScalar(1 + Math.sin(t * 0.8) * 0.04);
    const lift = clamp(1 - cap.position.y / 3);
    causticMat.opacity = (0.4 + Math.sin(t * 1.7) * 0.08 + Math.sin(t * 3.1) * 0.05) * lift * (state.burst ? 0.4 : 1);
    glow.visible = cap.position.y > -0.5;
    contact.position.x = cap.position.x;
    contact.position.z = cap.position.z;
    contactMat.opacity = 0.75 * clamp(1 - cap.position.y / 2.5);
    placeCamera(realDt);
    renderer.render(scene, camera);
    quality.sample(realDt);
  };
  requestAnimationFrame(tick);

  // Prepare everything before anything is shown: compile every shader, wait for the
  // font, render two frames so textures and the transmission pass exist; then the
  // loading screen fades and the capsule makes its entrance.
  progress(0.82);
  (async () => {
    try {
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch {
      /* compiling lazily on first use is the fallback */
    }
    progress(0.92);
    try {
      await document.fonts.ready;
    } catch {
      /* the system font stands in */
    }
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    // warm up with the capsule in view, so the plastic's refraction pass exists ...
    await frame();
    await frame();
    // ... then, still behind the loading screen, move it to where its entrance begins,
    // so it is never seen at rest before it arrives
    const intro = reduce ? null : entrances[g.entrance]();
    await frame();
    progress(1);
    await hideLoader();
    if (intro) intro.play();
    else settle();
  })();

  // ?debug exposes the scene for automated checks
  if (new URLSearchParams(location.search).has('debug')) window.__juhulia = { state, cap, body, gift, giftPhys, lidPhys, camera };
}
