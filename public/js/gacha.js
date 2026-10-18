// One capsule in a dark crypt: candles, ground fog, ash, gothic windows far behind.
// Each page brings the capsule in its own way, keeps the scene alive while it waits,
// opens it its own way when touched, fills the screen with light and forwards.
import * as THREE from 'three';
import { GACHAS } from './gachas.js';

const gsap = window.gsap;

const FLOOR = -1.0;
const FLOOD_AT = 2.9;
const ARRIVE_AT = 4.2;

const clamp = (x) => Math.max(0, Math.min(1, x));
const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outQuart = (x) => 1 - Math.pow(1 - x, 4);
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- textures drawn once ---------- */

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const softTexture = () =>
  canvasTexture(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

const flameTexture = () =>
  canvasTexture(64, 128, (g) => {
    const grd = g.createRadialGradient(32, 92, 2, 32, 80, 60);
    grd.addColorStop(0, 'rgba(255,250,235,1)');
    grd.addColorStop(0.25, 'rgba(255,214,140,0.95)');
    grd.addColorStop(0.6, 'rgba(255,140,40,0.35)');
    grd.addColorStop(1, 'rgba(255,90,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(32, 4);
    g.bezierCurveTo(52, 50, 58, 92, 32, 124);
    g.bezierCurveTo(6, 92, 12, 50, 32, 4);
    g.fill();
  });

// A lancet window with simple tracery, as seen glowing through fog.
const archTexture = () =>
  canvasTexture(128, 320, (g, w, h) => {
    const arch = (x, y, ww, hh) => {
      g.beginPath();
      g.moveTo(x, y + hh);
      g.lineTo(x, y + ww * 0.6);
      g.quadraticCurveTo(x, y, x + ww / 2, y - ww * 0.15);
      g.quadraticCurveTo(x + ww, y, x + ww, y + ww * 0.6);
      g.lineTo(x + ww, y + hh);
      g.closePath();
    };
    g.fillStyle = 'rgba(255,255,255,0.9)';
    arch(14, 34, 100, 280);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    g.fillRect(61, 70, 6, h); // mullion
    g.fillRect(14, 170, 100, 5); // transom
    g.lineWidth = 5;
    g.beginPath();
    g.arc(64, 92, 20, 0, Math.PI * 2);
    g.stroke();
    g.globalCompositeOperation = 'source-over';
  });

const batTexture = () =>
  canvasTexture(128, 64, (g) => {
    g.fillStyle = '#000';
    g.beginPath();
    g.moveTo(64, 26);
    g.quadraticCurveTo(44, 6, 4, 14);
    g.quadraticCurveTo(18, 22, 16, 34);
    g.quadraticCurveTo(28, 28, 34, 40);
    g.quadraticCurveTo(46, 32, 56, 44);
    g.lineTo(64, 40);
    g.lineTo(72, 44);
    g.quadraticCurveTo(82, 32, 94, 40);
    g.quadraticCurveTo(100, 28, 112, 34);
    g.quadraticCurveTo(110, 22, 124, 14);
    g.quadraticCurveTo(84, 6, 64, 26);
    g.fill();
  });

/* ---------- materials ---------- */

/** Additive light cone; dir 0 = bright at the top, 1 = bright at the bottom. */
function coneMaterial(color, dir) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: color.clone() }, uOpacity: { value: 0 }, uDir: { value: dir } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv; vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uDir;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float e = pow(abs(dot(vN, vV)), 2.0);
        float h = vUv.y; float a;
        if (uDir < 0.5) a = pow(h, 1.6) * smoothstep(0.0, 0.35, h) * smoothstep(1.0, 0.92, h);
        else a = pow(1.0 - h, 1.8) * smoothstep(1.0, 0.6, h);
        gl_FragColor = vec4(uColor * a * e * uOpacity, 1.0);
      }`,
  });
}

/** Point cloud with per-point size and alpha, drawn as soft discs. */
function softPoints(n, color, opacity, additive = true) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    defines: additive ? {} : { NORMAL_BLEND: '' },
    uniforms: { uColor: { value: color.clone() }, uOpacity: { value: opacity }, uScale: { value: 300 } },
    vertexShader: `
      attribute float aSize; attribute float aAlpha; varying float vAlpha; uniform float uScale;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(aSize * uScale / max(-mv.z, 0.5), 120.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        #ifdef NORMAL_BLEND
        gl_FragColor = vec4(uColor, a * a * vAlpha * uOpacity);
        #else
        gl_FragColor = vec4(uColor * a * a * vAlpha * uOpacity, 1.0);
        #endif
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/* ---------- the page ---------- */

export function start(slug) {
  const g = GACHAS[slug];
  const root = document.querySelector('[data-stage]');
  const canvas = root.querySelector('canvas');
  const button = root.querySelector('[data-open]');
  const hint = root.querySelector('[data-hint]');
  const flood = root.querySelector('[data-flood]');
  const end = root.querySelector('[data-end]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  flood.style.background = g.flood;
  end.style.background = g.flood;
  end.style.color = g.ink;

  const forward = () => {
    end.hidden = false;
    window.location.replace(g.url);
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    // No WebGL: the touch still fills the screen and forwards.
    hint.classList.add('is-visible');
    button.addEventListener('click', () => {
      flood.classList.add('is-on');
      setTimeout(forward, 1100);
    });
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);
  renderer.useLegacyLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.05);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
  const light = new THREE.Color(g.light);
  const accent = new THREE.Color(g.accent);
  const soft = softTexture();
  const flameTex = flameTexture();

  // Dim softboxes, only for reflections on the obsidian.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const box = (w, h, c, p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...p);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(5, 1.2, new THREE.Color(3, 2.7, 2.3), [0, 5, 1]);
  box(0.4, 5, new THREE.Color(1.3, 1.15, 0.95), [-4.5, 0.5, 2]);
  box(0.3, 4, new THREE.Color(0.6, 0.55, 0.5), [4, 1, -2.5]);
  box(6, 0.8, new THREE.Color(0.45, 0.38, 0.3), [0, -2.6, 3]);
  scene.environment = pmrem.fromScene(env, 0.03).texture;

  /* lights */
  const spot = new THREE.SpotLight(light, 2.0, 16, 0.34, 0.85, 1.4);
  spot.position.set(0, 6.2, 0.6);
  spot.target.position.set(0, FLOOR, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.radius = 6;
  spot.shadow.bias = -0.0004;
  const bounce = new THREE.HemisphereLight(0x000000, light, 0.22);
  const rim = new THREE.DirectionalLight(light, 0.45);
  rim.position.set(-3, -0.4, -4);
  const ambient = new THREE.AmbientLight(0xbfc8ff, 0.012);
  scene.add(spot, spot.target, bounce, rim, ambient);

  /* wet stone floor */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x060505, roughness: 0.3, metalness: 0.45, envMapIntensity: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR;
  floor.receiveShadow = true;
  scene.add(floor);

  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({ map: soft, color: light.clone().multiplyScalar(0.14), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = FLOOR + 0.004;
  scene.add(pool);

  const beamMat = coneMaterial(light, 0);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 2.1, 7.2, 64, 1, true), beamMat);
  beam.position.y = FLOOR + 3.6;
  scene.add(beam);

  /* gothic windows far behind, through the fog */
  const windowTint = slug === 'phantasialand' ? new THREE.Color('#8fa0ff') : slug === 'henne' ? new THREE.Color('#ff3a20') : new THREE.Color('#b08cff');
  const windowMat = new THREE.MeshBasicMaterial({ map: archTexture(), color: windowTint, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const windows = [-3.4, 0, 3.4].map((x, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(i === 1 ? 1.7 : 1.3, i === 1 ? 4.2 : 3.3), windowMat);
    m.position.set(x, 4.6 + (i === 1 ? 0.6 : 0), -26);
    scene.add(m);
    return m;
  });
  const windowBase = slug === 'phantasialand' ? 0.22 : 0.15;
  windowMat.opacity = windowBase;

  /* candles */
  const waxMat = new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.65 });
  const candles = g.candles.map(([x, z, h], i) => {
    const grp = new THREE.Group();
    grp.position.set(x, FLOOR, z);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, h, 20), waxMat);
    wax.position.y = h / 2;
    wax.castShadow = true;
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.y = h + 0.11;
    flame.scale.set(0.11, 0.22, 1);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color('#ffb060'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.y = h + 0.1;
    halo.scale.setScalar(0.9);
    grp.add(wax, flame, halo);
    let lamp = null;
    if (i < 3) {
      lamp = new THREE.PointLight(0xff9a48, 0.9, 5.5, 2);
      lamp.position.y = h + 0.15;
      grp.add(lamp);
    }
    scene.add(grp);
    return { grp, flame, halo, lamp, lit: 1, seed: Math.random() * 100, z };
  });

  /* ground fog */
  const fogMat = (o) => new THREE.SpriteMaterial({ map: soft, color: 0x2a2622, transparent: true, opacity: o, depthWrite: false });
  const fogs = Array.from({ length: 22 }, () => {
    const s = new THREE.Sprite(fogMat(rand(0.18, 0.32)));
    s.position.set(rand(-6, 6), FLOOR + rand(0.05, 0.35), rand(-7, 2.5));
    s.scale.set(rand(3, 6), rand(1.2, 2), 1);
    s.userData = { vx: rand(-0.08, 0.08), base: s.material.opacity, push: new THREE.Vector3() };
    scene.add(s);
    return s;
  });

  /* ash drifting in the beam */
  const AN = 160;
  const ash = softPoints(AN, light, 0.5);
  const aPos = ash.geometry.attributes.position;
  const aSize = ash.geometry.attributes.aSize;
  const aAlpha = ash.geometry.attributes.aAlpha;
  const aSeed = new Float32Array(AN);
  for (let i = 0; i < AN; i++) {
    const y = FLOOR + rand(0.1, 6.5);
    const r = 2 * Math.sqrt(Math.random());
    const an = rand(0, Math.PI * 2);
    aPos.setXYZ(i, Math.cos(an) * r, y, Math.sin(an) * r);
    aSize.setX(i, rand(0.025, 0.06));
    aAlpha.setX(i, rand(0.3, 1));
    aSeed[i] = rand(0, 10);
  }
  scene.add(ash);

  /* bats */
  const batTex = batTexture();
  const bats = Array.from({ length: slug === 'phantasialand' ? 5 : 2 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: batTex, color: 0x000000, transparent: true, depthWrite: false, fog: false }));
    s.scale.set(0.5, 0.25, 1);
    s.visible = false;
    s.userData = { t: -1, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), lift: 0, flap: rand(14, 20) };
    scene.add(s);
    return s;
  });
  const sendBat = (b, from, to, dur, lift = 1) => {
    Object.assign(b.userData, { t: 0, dur, lift });
    b.userData.from.copy(from);
    b.userData.to.copy(to);
    b.visible = true;
  };

  /* moon for Phantasialand */
  let moon = null;
  if (slug === 'phantasialand') {
    moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color('#dfe6ff'), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    moon.position.set(3.2, 6.5, -22);
    moon.scale.setScalar(5);
    scene.add(moon);
  }

  /* censer smoke for zense: a thin incense thread from a bowl on the left */
  let incense = null;
  if (slug === 'zense') {
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x2a2018, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }),
    );
    bowl.position.set(-2.6, FLOOR + 0.22, -1.6);
    scene.add(bowl);
    const IN = 70;
    const pts = softPoints(IN, accent.clone().lerp(new THREE.Color('#c8c0b8'), 0.5), 0.35, false);
    scene.add(pts);
    const born = new Float32Array(IN).map((_, i) => -i * 0.09);
    incense = { pts, born, origin: bowl.position.clone().add(new THREE.Vector3(0, 0.05, 0)), N: IN };
  }

  /* the floor ring Phantasialand rises through */
  const portal = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.35, 96),
    new THREE.MeshBasicMaterial({ map: soft, color: accent.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  portal.rotation.x = -Math.PI / 2;
  portal.position.y = FLOOR + 0.01;
  scene.add(portal);

  /* the capsule: obsidian over graphite, a silver seam */
  const cap = new THREE.Group();
  const capRest = new THREE.Vector3(0, FLOOR + 1, 0);
  cap.position.copy(capRest);
  cap.rotation.x = 0.14;
  scene.add(cap);
  const lid = new THREE.Group();
  cap.add(lid);
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x050405, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.7, side: THREE.DoubleSide }),
  );
  top.castShadow = true;
  lid.add(top);
  const base = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x181717, roughness: 0.45, metalness: 0.35, clearcoat: 0.25, clearcoatRoughness: 0.4, side: THREE.DoubleSide }),
  );
  base.castShadow = true;
  cap.add(base);
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xa8a49c, metalness: 1, roughness: 0.25, emissive: light.clone(), emissiveIntensity: 0 });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(1.004, 0.012, 12, 160), seamMat);
  seam.rotation.x = Math.PI / 2;
  cap.add(seam);
  const lidSeam = new THREE.Mesh(new THREE.TorusGeometry(1.004, 0.008, 12, 160), seamMat);
  lidSeam.rotation.x = Math.PI / 2;
  lidSeam.position.y = 0.004;
  lid.add(lidSeam);
  const haloMat = new THREE.MeshBasicMaterial({ color: light.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const seamHalo = new THREE.Mesh(new THREE.TorusGeometry(1.006, 0.03, 16, 160), haloMat);
  seamHalo.rotation.x = Math.PI / 2;
  cap.add(seamHalo);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.992, 96), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
  core.rotation.x = -Math.PI / 2;
  core.position.y = -0.002;
  cap.add(core);
  const lidCore = new THREE.Mesh(new THREE.CircleGeometry(0.992, 96), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide }));
  lidCore.rotation.x = Math.PI / 2;
  lidCore.position.y = 0.002;
  lid.add(lidCore);
  const inner = new THREE.PointLight(light, 0, 7, 1.6);
  inner.position.set(0, 0.35, 0);
  cap.add(inner);

  const contactMat = new THREE.MeshBasicMaterial({ map: soft, color: 0x000000, transparent: true, opacity: 0.9, depthWrite: false });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = FLOOR + 0.006;
  scene.add(contact);

  const shaftMat = coneMaterial(light, 1);
  const shaftGeo = new THREE.CylinderGeometry(1.9, 0.98, 5, 96, 1, true);
  shaftGeo.translate(0, 2.5, 0);
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.scale.y = 0.01;
  cap.add(shaft);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: light.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.setScalar(0.5);
  scene.add(glow);

  /* ---------- the three openings ---------- */

  const effects = {
    // zense: the lid unscrews like a perfume cap; incense curls out.
    incense() {
      const N = 150;
      const mist = softPoints(N, accent.clone().lerp(new THREE.Color('#e8dcc8'), 0.55), 0.26, false);
      scene.add(mist);
      const pos = mist.geometry.attributes.position;
      const size = mist.geometry.attributes.aSize;
      const alpha = mist.geometry.attributes.aAlpha;
      const born = new Float32Array(N).fill(-1);
      const seed = new Float32Array(N).map(() => rand(0, 100));
      const at = new THREE.Vector3();
      return {
        camera: { y: 1.4, z: 0.62, look: new THREE.Vector3(0, 1.1, 0) },
        glow: 0.45,
        update(s, dt) {
          const p = inOut(clamp((s - 1.4) / 1.7));
          lid.position.set(0, p * 1.35, 0);
          lid.rotation.set(-p * 0.12, p * 2.2, 0);
          core.material.color.copy(light).multiplyScalar(clamp((s - 1.5) / 1.0) * 1.4);
          inner.intensity = p * 3.5;
          cap.localToWorld(at.set(0, 0.1, 0));
          const emit = s > 1.5 ? Math.floor(clamp((s - 1.5) / 1.4) * N) : 0;
          for (let i = 0; i < N; i++) {
            if (i < emit && born[i] < 0) {
              born[i] = s;
              const an = rand(0, Math.PI * 2);
              const r = rand(0.5, 0.95);
              pos.setXYZ(i, at.x + Math.cos(an) * r, at.y, at.z + Math.sin(an) * r);
            }
            if (born[i] < 0) continue;
            const age = s - born[i];
            const sd = seed[i];
            pos.setXYZ(
              i,
              pos.getX(i) + (Math.sin(age * 1.3 + sd) * 0.35 + Math.sin(sd) * 0.12) * dt,
              pos.getY(i) + (0.75 + (sd % 1) * 0.5) * dt,
              pos.getZ(i) + Math.cos(age * 1.1 + sd) * 0.3 * dt,
            );
            size.setX(i, 0.8 + age * 1.2);
            alpha.setX(i, Math.min(1, age * 1.2) * Math.max(0, 1 - age / 4));
          }
          pos.needsUpdate = size.needsUpdate = alpha.needsUpdate = true;
        },
      };
    },

    // Henne.: the lid lifts back on a hinge like a reliquary over a pool of wine.
    wine() {
      const wine = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uGlow: { value: 0 }, uLight: { value: light.clone() } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uTime; uniform float uGlow; uniform vec3 uLight; varying vec2 vUv;
          void main() {
            vec2 c = vUv - 0.5; float r = length(c) * 2.0;
            float ripple = sin(r * 18.0 - uTime * 1.6) * 0.5 + 0.5;
            ripple *= smoothstep(1.0, 0.2, r);
            vec3 col = mix(vec3(0.10, 0.004, 0.0), vec3(0.42, 0.03, 0.02), smoothstep(1.0, 0.0, r));
            col += uLight * (pow(ripple, 8.0) * 0.35 + smoothstep(0.35, 0.0, length(c - vec2(-0.12, 0.1))) * 0.5);
            gl_FragColor = vec4(col * uGlow, 1.0);
          }`,
      });
      core.material = wine;
      return {
        camera: { y: 2.4, z: 0.5, look: new THREE.Vector3(0, -0.1, 0) },
        glow: 0.8,
        face: 0, // hinge at the back, away from the viewer
        update(s, _dt, t) {
          wine.uniforms.uTime.value = t;
          const p = inOut(clamp((s - 1.6) / 1.8));
          const a = p * 1.75;
          lid.rotation.set(-a, 0, 0);
          lid.position.set(0, Math.sin(a) + p * 0.15, -1 + Math.cos(a));
          wine.uniforms.uGlow.value = clamp((s - 1.6) / 1.2) * 1.6;
          inner.intensity = p * 6 * (0.85 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23) * 0.05);
        },
      };
    },

    // Phantasialand: the capsule levitates inside turning rings; the bats scatter.
    orbit() {
      const rings = [1.55, 1.85, 2.15].map((r, i) => {
        const m = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.008 + i * 0.002, 8, 220),
          new THREE.MeshBasicMaterial({ color: i === 1 ? accent.clone() : light.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        cap.add(m);
        return m;
      });
      const axes = [new THREE.Euler(1.2, 0, 0.3), new THREE.Euler(0.4, 0.9, 0), new THREE.Euler(-0.7, 0.2, 1.1)];
      const N = 160;
      const sparks = softPoints(N, light, 1.0);
      scene.add(sparks);
      const pos = sparks.geometry.attributes.position;
      const size = sparks.geometry.attributes.aSize;
      const alpha = sparks.geometry.attributes.aAlpha;
      const ph = new Float32Array(N).map(() => Math.random());
      let scattered = false;
      return {
        camera: { y: 1.6, z: 0.66, look: new THREE.Vector3(0, 1.3, 0) },
        glow: 1,
        update(s, _dt, t) {
          const pr = outQuart(clamp((s - 0.8) / 1.4));
          rings.forEach((m, i) => {
            m.material.opacity = pr * (0.9 - i * 0.2);
            m.scale.setScalar(0.6 + pr * 0.4);
            m.rotation.set(axes[i].x + t * (0.5 + i * 0.25), axes[i].y + t * (0.35 - i * 0.3), axes[i].z);
          });
          if (s > 1.0 && !scattered) {
            scattered = true;
            lightning(0.9);
            bats.forEach((b, i) => {
              const an = (i / bats.length) * Math.PI * 2;
              sendBat(b, cap.position.clone(), new THREE.Vector3(Math.cos(an) * 9, 6 + i, Math.sin(an) * 4 - 6), 1.8, 2);
            });
          }
          const p = inOut(clamp((s - 1.6) / 1.7));
          cap.position.y = capRest.y + p * 0.45;
          lid.position.set(0, p * 1.7, 0);
          lid.rotation.set(p * 0.18, -p * 0.6, 0);
          core.material.color.copy(light).multiplyScalar(clamp((s - 1.7) / 1.0) * 3);
          inner.intensity = p * 7;
          const on = clamp((s - 1.9) / 0.6);
          for (let i = 0; i < N; i++) {
            const u = (ph[i] + (s - 1.9) * 0.28) % 1;
            const an = ph[i] * 40 + u * 9;
            const r = 0.35 + u * 1.4;
            pos.setXYZ(i, Math.cos(an) * r, cap.position.y + 0.1 + u * 5.5, Math.sin(an) * r);
            size.setX(i, 0.05 + (1 - u) * 0.05);
            alpha.setX(i, on * Math.sin(Math.max(0, u) * Math.PI));
          }
          pos.needsUpdate = size.needsUpdate = alpha.needsUpdate = true;
        },
      };
    },
  };
  const effect = effects[g.opening]();

  /* ---------- camera ---------- */

  let dist = 14;
  const camFrom = new THREE.Vector3();
  const lookFrom = new THREE.Vector3(0, -0.2, 0);
  const lookAt = new THREE.Vector3();
  const shake = { x: 0, y: 0 };
  const camTo = new THREE.Vector3();
  const placeCamera = (p) => {
    camFrom.set(shake.x, 1.0 + shake.y, dist);
    // End close enough to fill the frame with light, never inside the capsule.
    camTo.set(0, effect.camera.y, Math.max(dist * effect.camera.z, 4.2));
    camera.position.lerpVectors(camFrom, camTo, p);
    lookAt.lerpVectors(lookFrom, effect.camera.look, p);
    camera.lookAt(lookAt);
  };

  const state = { mode: 'entering', start: 0, rotY0: 0, rotYT: 0, flooded: false, queued: false, p3: 0 };

  const fit = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max(2 / 0.5 / (2 * tan * camera.aspect), 2 / 0.34 / (2 * tan));
    const scale = h * renderer.getPixelRatio() * 0.5;
    scene.traverse((o) => {
      if (o.isPoints && o.material.uniforms) o.material.uniforms.uScale.value = scale;
    });
  };
  fit();
  placeCamera(0);
  new ResizeObserver(fit).observe(canvas);

  /* ---------- weather while waiting ---------- */

  const flash = document.querySelector('[data-lightning]');
  function lightning(strength = 1) {
    const tl = gsap.timeline();
    tl.to(ambient, { intensity: 1.4 * strength, duration: 0.05 })
      .to(ambient, { intensity: 0.012, duration: 0.12 })
      .to(ambient, { intensity: 0.9 * strength, duration: 0.04 })
      .to(ambient, { intensity: 0.012, duration: 0.6, ease: 'power2.out' });
    gsap.fromTo(windowMat, { opacity: 1 }, { opacity: windowBase, duration: 0.9, ease: 'power2.out' });
    if (flash && !reduce) gsap.fromTo(flash, { opacity: 0.22 * strength }, { opacity: 0, duration: 0.5, ease: 'power2.out' });
  }

  // A draught now and then: every flame leans and dips, the fog stirs.
  const gust = { lean: 0, dim: 0 };
  const scheduleGust = () => {
    if (state.mode === 'done') return;
    gsap.delayedCall(rand(7, 13), () => {
      if (state.mode === 'idle' || state.mode === 'entering') {
        gsap.timeline()
          .to(gust, { lean: rand(-0.5, 0.5), dim: 0.55, duration: 0.6, ease: 'power2.out' })
          .to(gust, { lean: 0, dim: 0, duration: 1.6, ease: 'power2.inOut' });
        fogs.forEach((f) => (f.userData.vx += rand(-0.15, 0.15)));
      }
      scheduleGust();
    });
  };

  const schedulePhantasia = () => {
    if (slug !== 'phantasialand' || reduce) return;
    gsap.delayedCall(rand(8, 14), () => {
      if (state.mode === 'idle') lightning(rand(0.5, 0.9));
      schedulePhantasia();
    });
  };

  const scheduleBats = () => {
    if (reduce) return;
    gsap.delayedCall(rand(slug === 'phantasialand' ? 3 : 9, slug === 'phantasialand' ? 7 : 16), () => {
      if (state.mode === 'idle') {
        const b = bats.find((x) => x.userData.t < 0);
        if (b) {
          const left = Math.random() < 0.5;
          const y = rand(3.5, 6.5);
          sendBat(b, new THREE.Vector3(left ? -12 : 12, y, -14), new THREE.Vector3(left ? 12 : -12, y + rand(-1, 1.5), -9), rand(3, 4.5), 0.8);
        }
      }
      scheduleBats();
    });
  };

  /* ---------- entrances ---------- */

  const showHint = () => hint.classList.add('is-visible');
  const settle = () => {
    state.mode = 'idle';
    showHint();
    scheduleGust();
    schedulePhantasia();
    scheduleBats();
    if (state.queued) open();
  };

  const stirFog = (strength) =>
    fogs.forEach((f) => {
      const d = Math.hypot(f.position.x, f.position.z) + 0.5;
      f.userData.push.set(f.position.x / d, 0, f.position.z / d).multiplyScalar(strength / d);
    });

  const entrances = {
    // Falls from the dark above and bounces to rest.
    drop() {
      const tl = gsap.timeline({ onComplete: settle });
      cap.position.y = capRest.y + 9;
      cap.rotation.y = -2;
      const D = 1.9;
      tl.to(cap.position, { y: capRest.y, duration: D, ease: 'bounce.out' }, 0.4)
        .to(cap.rotation, { y: 0.6, duration: D + 0.6, ease: 'power2.out' }, 0.4);
      [[0.364, 0.16], [0.727, 0.07], [0.909, 0.03]].forEach(([at, amp]) => {
        tl.add(() => {
          stirFog(amp * 8);
          gsap.fromTo(shake, { y: -amp }, { y: 0, duration: 0.35, ease: 'elastic.out(1, 0.3)' });
          gsap.fromTo(gust, { dim: amp * 3 }, { dim: 0, duration: 0.6 });
        }, 0.4 + at * D);
      });
      return tl;
    },
    // Glides out of the fog from far away; each candle lights as it passes.
    approach() {
      candles.forEach((c) => (c.lit = 0));
      const tl = gsap.timeline({ onComplete: settle });
      cap.position.z = -30;
      cap.rotation.x = 0.14 - 30;
      tl.to(cap.position, { z: 0, duration: 4.2, ease: 'power2.out' }, 0.3)
        .to(cap.rotation, { x: 0.14, duration: 4.2, ease: 'power2.out' }, 0.3);
      [...candles]
        .sort((a, b) => a.z - b.z)
        .forEach((c, i) => tl.to(c, { lit: 1, duration: 0.5, ease: 'power2.out' }, 1.6 + i * 0.45));
      return tl;
    },
    // Lightning, then the capsule rises out of a glowing ring in the floor.
    rise() {
      const tl = gsap.timeline({ onComplete: settle });
      cap.position.y = capRest.y - 2.3;
      tl.add(() => lightning(1), 0.4)
        .to(portal.material, { opacity: 0.9, duration: 0.6, ease: 'power2.out' }, 0.5)
        .to(cap.position, { y: capRest.y, duration: 2.4, ease: 'power3.out' }, 0.9)
        .to(cap.rotation, { y: Math.PI * 1.5, duration: 2.6, ease: 'power2.out' }, 0.9)
        .add(() => stirFog(1.2), 1.0)
        .to(portal.material, { opacity: 0, duration: 1.4, ease: 'power2.inOut' }, 2.6);
      tl.add(() => {
        bats.slice(0, 3).forEach((b, i) => {
          const an = (i / 3) * Math.PI * 2 + 0.4;
          sendBat(b, new THREE.Vector3(0, FLOOR + 0.3, 0), new THREE.Vector3(Math.cos(an) * 10, 6, Math.sin(an) * 3 - 8), 2.2, 1.5);
        });
      }, 1.2);
      return tl;
    },
  };

  if (reduce) {
    settle();
  } else {
    entrances[g.entrance]();
  }

  /* ---------- opening ---------- */

  function open() {
    if (state.mode === 'entering') {
      state.queued = true;
      return;
    }
    if (state.mode !== 'idle') return;
    state.mode = 'opening';
    state.start = performance.now();
    state.rotY0 = cap.rotation.y;
    state.rotYT = Math.ceil(state.rotY0 / (Math.PI * 2)) * Math.PI * 2 + (effect.face ?? Math.PI * 0.25);
    hint.classList.remove('is-visible');
    button.disabled = true;
  }
  button.addEventListener('click', open);

  /* ---------- frame loop ---------- */

  let last = performance.now();
  let t = 0;
  const speed = reduce ? 1.6 : 1;
  const tmp = new THREE.Vector3();

  const tick = (now) => {
    if (state.mode === 'done') return;
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    // ash
    for (let i = 0; i < AN; i++) {
      let y = aPos.getY(i) + dt * (0.04 + (aSeed[i] % 1) * 0.05);
      if (y > FLOOR + 6.6) y = FLOOR + 0.1;
      aPos.setXYZ(i, aPos.getX(i) + Math.sin(t * 0.3 + aSeed[i]) * dt * 0.03, y, aPos.getZ(i));
    }
    aPos.needsUpdate = true;

    // candles
    for (const c of candles) {
      const n = Math.sin(t * 9 + c.seed) * 0.5 + Math.sin(t * 23 + c.seed * 2) * 0.3 + Math.sin(t * 3.1 + c.seed) * 0.2;
      const k = c.lit * (1 - gust.dim * 0.6) * (0.92 + n * 0.08);
      c.flame.scale.set(0.11 * k, 0.22 * k * (1 + n * 0.08), 1);
      c.flame.material.rotation = gust.lean * 0.6 + n * 0.05;
      c.halo.material.opacity = 0.35 * k;
      if (c.lamp) c.lamp.intensity = 0.9 * k;
    }

    // fog
    for (const f of fogs) {
      const u = f.userData;
      f.position.x += (u.vx * 0.3 + u.push.x) * dt;
      f.position.z += u.push.z * dt;
      u.push.multiplyScalar(Math.pow(0.4, dt));
      u.vx *= Math.pow(0.98, dt);
      if (f.position.x > 8) f.position.x = -8;
      if (f.position.x < -8) f.position.x = 8;
      f.material.rotation += dt * 0.02 * Math.sign(u.vx || 1);
    }

    // bats
    for (const b of bats) {
      const u = b.userData;
      if (u.t < 0) continue;
      u.t += dt / u.dur;
      if (u.t >= 1) {
        u.t = -1;
        b.visible = false;
        continue;
      }
      b.position.lerpVectors(u.from, u.to, u.t);
      b.position.y += Math.sin(u.t * Math.PI) * u.lift;
      const flap = Math.abs(Math.sin(t * u.flap));
      b.scale.set(0.5 * (0.45 + flap * 0.55), 0.25, 1);
    }

    // incense thread
    if (incense) {
      const { pts, born, origin, N } = incense;
      const pos = pts.geometry.attributes.position;
      const size = pts.geometry.attributes.aSize;
      const alpha = pts.geometry.attributes.aAlpha;
      for (let i = 0; i < N; i++) {
        born[i] += dt;
        let age = born[i];
        if (age > 6.3) {
          born[i] = 0;
          age = 0;
        }
        if (age < 0) continue;
        const y = origin.y + age * 0.45;
        const sway = Math.sin(age * 1.4 + t * 0.6) * age * 0.12 + gust.lean * age * 0.4;
        pos.setXYZ(i, origin.x + sway, y, origin.z + Math.cos(age * 1.1) * age * 0.05);
        size.setX(i, 0.12 + age * 0.22);
        alpha.setX(i, Math.min(1, age * 2) * Math.max(0, 1 - age / 6.3));
      }
      pos.needsUpdate = size.needsUpdate = alpha.needsUpdate = true;
    }

    if (moon) moon.material.opacity = 0.5 + Math.sin(t * 0.2) * 0.05;

    if (state.mode === 'idle') {
      cap.rotation.y += dt * 0.16;
      // a slow heartbeat in the seam
      const beat = Math.pow(Math.max(0, Math.sin(t * 1.9)), 12) + Math.pow(Math.max(0, Math.sin(t * 1.9 - 0.5)), 16) * 0.6;
      seamMat.emissiveIntensity = beat * 0.9;
      beamMat.uniforms.uOpacity.value = 0.18 + Math.sin(t * 0.5) * 0.02;
      placeCamera(0);
    } else if (state.mode === 'entering') {
      beamMat.uniforms.uOpacity.value = 0.18;
      placeCamera(0);
    } else if (state.mode === 'opening') {
      const s = ((now - state.start) / 1000) * speed;
      const p0 = inOut(clamp(s / 1.0));
      cap.rotation.y = state.rotY0 + (state.rotYT - state.rotY0) * p0;
      cap.rotation.x = 0.14 + 0.1 * p0;
      spot.intensity = 2.0 + 1.2 * p0;
      const p1 = outQuart(clamp((s - 0.7) / 0.9));
      seamMat.emissiveIntensity = p1 * 5;
      haloMat.opacity = p1 * 0.85 * (1 - clamp((s - 2.2) / 0.8) * 0.6);
      effect.update(s, dt, t);
      const p2 = inOut(clamp((s - 1.6) / 1.6));
      shaftMat.uniforms.uOpacity.value = p2 * 0.75;
      shaft.scale.y = 0.01 + p2 * 0.99;
      beamMat.uniforms.uOpacity.value = 0.18 * (1 - p2 * 0.7);
      candles.forEach((c) => (c.lit = 1 + p2 * 0.6));
      glow.position.copy(cap.localToWorld(tmp.set(0, 0.25, 0)));
      const p3 = reduce ? 0 : inOut(clamp((s - 2.2) / 1.8));
      placeCamera(p3);
      glow.material.opacity = Math.min(1, (p2 * 0.8 + p3 * 0.6) * effect.glow + p3 * 0.3);
      glow.scale.setScalar(0.5 + (p2 * 3.5 + p3 * 14) * Math.max(effect.glow, 0.6));
      if (s >= FLOOD_AT && !state.flooded) {
        state.flooded = true;
        flood.classList.add('is-on');
      }
      if (s >= ARRIVE_AT) {
        state.mode = 'done';
        forward();
      }
    }

    contactMat.opacity = 0.9 * (1 - clamp((cap.position.y - capRest.y) / 0.5)) * (cap.position.y < capRest.y - 0.05 ? 0 : 1);
    contact.position.x = cap.position.x;
    contact.position.z = cap.position.z;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);

  // Back button restores the page from cache: start over cleanly.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) window.location.reload();
  });
}
