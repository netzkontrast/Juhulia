'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Gacha } from '@/lib/gachas';
import { hostOf } from '@/lib/gachas';
import styles from './GachaStage.module.css';

type Phase = 'idle' | 'opening' | 'flood' | 'arrived';

/** Seconds into the opening at which the screen fills and the page forwards. */
const FLOOD_AT = 3.5;
const ARRIVE_AT = 4.5;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outQuart = (x: number) => 1 - Math.pow(1 - x, 4);

type Effect = {
  update: (s: number, dt: number, t: number) => void;
  reset: () => void;
  /** Where the camera ends up when it moves into the light. */
  camera: { to: THREE.Vector3; look: THREE.Vector3 };
};

type Ctx = {
  scene: THREE.Scene;
  cap: THREE.Group;
  lid: THREE.Group;
  core: THREE.Mesh;
  inner: THREE.PointLight;
  light: THREE.Color;
  soft: THREE.Texture;
};

/* ---------- shared helpers ---------- */

function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Additive light cone; dir 0 = bright at the top, 1 = bright at the bottom. */
function coneMaterial(color: THREE.Color, dir: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: color.clone() }, uOpacity: { value: 0 }, uDir: { value: dir } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv; vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
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
function softPoints(n: number, color: THREE.Color, opacity: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: color.clone() }, uOpacity: { value: opacity }, uScale: { value: 300 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aAlpha; varying float vAlpha; uniform float uScale;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor * a * a * vAlpha * uOpacity, 1.0);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/* ---------- the three openings ---------- */

/** zense: the lid unscrews like a perfume cap and a column of scent rises. */
function mistEffect(ctx: Ctx): Effect {
  const N = 220;
  const mist = softPoints(N, ctx.light, 0.9);
  ctx.scene.add(mist);
  const pos = mist.geometry.attributes.position as THREE.BufferAttribute;
  const size = mist.geometry.attributes.aSize as THREE.BufferAttribute;
  const alpha = mist.geometry.attributes.aAlpha as THREE.BufferAttribute;
  const born = new Float32Array(N).fill(-1);
  const seed = new Float32Array(N).map(() => Math.random() * 100);
  const coreMat = ctx.core.material as THREE.MeshBasicMaterial;
  const at = new THREE.Vector3();

  const reset = () => {
    born.fill(-1);
    for (let i = 0; i < N; i++) alpha.setX(i, 0);
    alpha.needsUpdate = true;
  };
  reset();

  return {
    camera: { to: new THREE.Vector3(0, 3.8, 2.6), look: new THREE.Vector3(0, 1.6, 0) },
    reset,
    update(s, dt) {
      const p = inOut(clamp((s - 1.6) / 1.7));
      ctx.lid.position.set(0, p * 1.35, 0);
      ctx.lid.rotation.set(-p * 0.12, p * 2.2, 0);
      coreMat.color.copy(ctx.light).multiplyScalar(clamp((s - 1.7) / 1.0) * 2.4);
      ctx.inner.intensity = p * 5;

      ctx.cap.localToWorld(at.set(0, 0.1, 0));
      const emit = s > 1.8 ? Math.floor(clamp((s - 1.8) / 1.6) * N) : 0;
      for (let i = 0; i < N; i++) {
        if (i < emit && born[i] < 0) {
          born[i] = s;
          pos.setXYZ(i, at.x + (Math.random() - 0.5) * 0.8, at.y, at.z + (Math.random() - 0.5) * 0.8);
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
        size.setX(i, 0.7 + age * 1.4);
        alpha.setX(i, Math.min(1, age * 1.5) * Math.max(0, 1 - age / 4.5));
      }
      pos.needsUpdate = true;
      size.needsUpdate = true;
      alpha.needsUpdate = true;
    },
  };
}

/** Henne.: the lid lifts back like a cloche over a surface of wine, lit by candlelight. */
function wineEffect(ctx: Ctx): Effect {
  const wine = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uLight: { value: ctx.light.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uGlow; uniform vec3 uLight; varying vec2 vUv;
      void main() {
        vec2 c = vUv - 0.5; float r = length(c) * 2.0;
        float ripple = sin(r * 18.0 - uTime * 1.6) * 0.5 + 0.5;
        ripple *= smoothstep(1.0, 0.2, r);
        vec3 deep = vec3(0.10, 0.004, 0.0);
        vec3 body = vec3(0.42, 0.03, 0.02);
        vec3 col = mix(deep, body, smoothstep(1.0, 0.0, r));
        float spec = pow(ripple, 8.0) * 0.35 + smoothstep(0.35, 0.0, length(c - vec2(-0.12, 0.1))) * 0.5;
        col += uLight * spec;
        gl_FragColor = vec4(col * uGlow, 1.0);
      }`,
  });
  ctx.core.material = wine;
  const flicker = () => 0.85 + Math.sin(performance.now() * 0.011) * 0.06 + Math.sin(performance.now() * 0.023) * 0.05;

  return {
    camera: { to: new THREE.Vector3(0, 2.4, 2.2), look: new THREE.Vector3(0, 0, 0) },
    reset() {
      wine.uniforms.uGlow.value = 0;
      ctx.lid.rotation.set(0, 0, 0);
      ctx.lid.position.set(0, 0, 0);
    },
    update(s, _dt, t) {
      wine.uniforms.uTime.value = t;
      const p = inOut(clamp((s - 1.6) / 1.8));
      const a = p * 1.75;
      // Hinge at the back edge of the seam.
      ctx.lid.rotation.set(-a, 0, 0);
      ctx.lid.position.set(0, Math.sin(a) + p * 0.15, -1 + Math.cos(a));
      wine.uniforms.uGlow.value = clamp((s - 1.6) / 1.2) * 1.6;
      ctx.inner.intensity = p * 6 * flicker();
    },
  };
}

/** Phantasialand: the capsule rises inside turning rings of light, sparks spiral upward. */
function orbitEffect(ctx: Ctx): Effect {
  const ringMat = (o: number) =>
    new THREE.MeshBasicMaterial({ color: ctx.light.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, userData: { o } });
  const rings = [1.55, 1.85, 2.15].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008 + i * 0.002, 8, 220), ringMat(0.9 - i * 0.2));
    ctx.cap.add(m);
    return m;
  });
  const axes = [new THREE.Euler(1.2, 0, 0.3), new THREE.Euler(0.4, 0.9, 0), new THREE.Euler(-0.7, 0.2, 1.1)];
  const N = 180;
  const sparks = softPoints(N, ctx.light, 1.0);
  ctx.scene.add(sparks);
  const pos = sparks.geometry.attributes.position as THREE.BufferAttribute;
  const size = sparks.geometry.attributes.aSize as THREE.BufferAttribute;
  const alpha = sparks.geometry.attributes.aAlpha as THREE.BufferAttribute;
  const phase = new Float32Array(N).map(() => Math.random());
  const coreMat = ctx.core.material as THREE.MeshBasicMaterial;

  const reset = () => {
    rings.forEach((m) => {
      (m.material as THREE.MeshBasicMaterial).opacity = 0;
      m.scale.setScalar(0.6);
    });
    for (let i = 0; i < N; i++) alpha.setX(i, 0);
    alpha.needsUpdate = true;
    ctx.cap.position.y = 0;
  };
  reset();

  return {
    camera: { to: new THREE.Vector3(0, 3.0, 3.4), look: new THREE.Vector3(0, 1.4, 0) },
    reset,
    update(s, _dt, t) {
      const pr = outQuart(clamp((s - 0.8) / 1.4));
      rings.forEach((m, i) => {
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = pr * (mat.userData.o as number);
        m.scale.setScalar(0.6 + pr * 0.4);
        m.rotation.set(axes[i].x + t * (0.5 + i * 0.25), axes[i].y + t * (0.35 - i * 0.3), axes[i].z);
      });
      const p = inOut(clamp((s - 1.6) / 1.7));
      ctx.cap.position.y = p * 0.45;
      ctx.lid.position.set(0, p * 1.7, 0);
      ctx.lid.rotation.set(p * 0.18, -p * 0.6, 0);
      coreMat.color.copy(ctx.light).multiplyScalar(clamp((s - 1.7) / 1.0) * 3);
      ctx.inner.intensity = p * 7;

      const on = clamp((s - 1.9) / 0.6);
      for (let i = 0; i < N; i++) {
        const u = (phase[i] + (s - 1.9) * 0.28) % 1;
        const an = phase[i] * 40 + u * 9;
        const r = 0.35 + u * 1.4;
        pos.setXYZ(i, Math.cos(an) * r, ctx.cap.position.y + 0.1 + u * 5.5, Math.sin(an) * r);
        size.setX(i, 0.05 + (1 - u) * 0.05);
        alpha.setX(i, on * Math.sin(u * Math.PI));
      }
      pos.needsUpdate = true;
      size.needsUpdate = true;
      alpha.needsUpdate = true;
    },
  };
}

const EFFECTS = { mist: mistEffect, wine: wineEffect, orbit: orbitEffect };

/* ---------- component ---------- */

export default function GachaStage({ gacha }: { gacha: Gacha }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const openRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const { look } = gacha;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const light = new THREE.Color(look.light);

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 1);
    renderer.useLegacyLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // Invisible softboxes, only for reflections on the capsule.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    const box = (w: number, h: number, c: THREE.Color, p: [number, number, number]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(...p);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(5, 1.4, new THREE.Color(4, 3.8, 3.5), [0, 5, 1]);
    box(0.5, 5, new THREE.Color(1.6, 1.55, 1.45), [-4.5, 0.5, 2]);
    box(0.3, 4, new THREE.Color(0.7, 0.68, 0.64), [4, 1, -2.5]);
    box(6, 0.8, new THREE.Color(0.55, 0.5, 0.45), [0, -2.6, 3]);
    scene.environment = pmrem.fromScene(env, 0.03).texture;

    const soft = softTexture();

    // One light from above, as in a vitrine.
    const spot = new THREE.SpotLight(light, 2.4, 14, 0.36, 0.85, 1.4);
    spot.position.set(0, 6.2, 0.6);
    spot.target.position.set(0, -0.4, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.radius = 6;
    spot.shadow.bias = -0.0004;
    // Light the floor gives back, and a thin rim so the lower half reads against black.
    const bounce = new THREE.HemisphereLight(0x000000, light, 0.3);
    const rim = new THREE.DirectionalLight(light, 0.55);
    rim.position.set(-3, -0.6, -4);
    scene.add(spot, spot.target, bounce, rim, new THREE.AmbientLight(0xffffff, 0.015));

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.55 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;
    scene.add(floor);

    const beamMat = coneMaterial(light, 0);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 2.1, 7.2, 64, 1, true), beamMat);
    beam.position.y = 2.35;
    scene.add(beam);

    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshBasicMaterial({ map: soft, color: light.clone().multiplyScalar(0.16), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -1.245;
    scene.add(pool);

    // Capsule
    const cap = new THREE.Group();
    scene.add(cap);
    const lid = new THREE.Group();
    cap.add(lid);
    const topMat = new THREE.MeshPhysicalMaterial({ ...look.top, color: look.top.color, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, side: THREE.DoubleSide });
    const top = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), topMat);
    top.castShadow = true;
    lid.add(top);
    const baseMat = new THREE.MeshPhysicalMaterial({ ...look.base, color: look.base.color, clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
    const base = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), baseMat);
    base.castShadow = true;
    cap.add(base);
    const seamMat = new THREE.MeshStandardMaterial({ color: look.seam, metalness: 1, roughness: 0.28, emissive: light.clone(), emissiveIntensity: 0 });
    const seam = new THREE.Mesh(new THREE.TorusGeometry(1.004, 0.012, 12, 160), seamMat);
    seam.rotation.x = Math.PI / 2;
    cap.add(seam);
    const lidSeam = new THREE.Mesh(new THREE.TorusGeometry(1.004, 0.008, 12, 160), seamMat);
    lidSeam.rotation.x = Math.PI / 2;
    lidSeam.position.y = 0.004;
    lid.add(lidSeam);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.01, 0.07, 16, 160),
      new THREE.MeshBasicMaterial({ color: light.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    halo.rotation.x = Math.PI / 2;
    cap.add(halo);
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

    const shaftMat = coneMaterial(light, 1);
    const shaftGeo = new THREE.CylinderGeometry(1.9, 0.98, 5, 96, 1, true);
    shaftGeo.translate(0, 2.5, 0);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.scale.y = 0.01;
    cap.add(shaft);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: light.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(0.5);
    scene.add(glow);

    // Dust drifting in the beam
    const DN = 240;
    const dust = softPoints(DN, light, 0.55);
    const dPos = dust.geometry.attributes.position as THREE.BufferAttribute;
    const dSize = dust.geometry.attributes.aSize as THREE.BufferAttribute;
    const dAlpha = dust.geometry.attributes.aAlpha as THREE.BufferAttribute;
    const dSeed = new Float32Array(DN);
    for (let i = 0; i < DN; i++) {
      const y = -1.1 + Math.random() * 6.5;
      const r = (0.22 + 1.88 * (1 - (y + 1.25) / 7.2)) * Math.sqrt(Math.random()) * 0.9;
      const an = Math.random() * Math.PI * 2;
      dPos.setXYZ(i, Math.cos(an) * r, y, Math.sin(an) * r);
      dSize.setX(i, 0.03 + Math.random() * 0.03);
      dAlpha.setX(i, 0.4 + Math.random() * 0.6);
      dSeed[i] = Math.random() * 10;
    }
    scene.add(dust);

    const effect = EFFECTS[gacha.effect]({ scene, cap, lid, core, inner, light, soft });

    // Fit the capsule to about 56% of the width (or 36% of the height on wide screens).
    let dist = 14;
    const camFrom = new THREE.Vector3();
    const lookFrom = new THREE.Vector3(0, 0.35, 0);
    const lookAt = new THREE.Vector3();
    const placeCamera = (p: number) => {
      camFrom.set(0, 1.0, dist);
      camera.position.lerpVectors(camFrom, effect.camera.to, p);
      lookAt.lerpVectors(lookFrom, effect.camera.look, p);
      camera.lookAt(lookAt);
    };
    const fit = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      dist = Math.max(2 / 0.56 / (2 * tan * camera.aspect), 2 / 0.36 / (2 * tan));
      if (anim.mode === 'idle') placeCamera(0);
      const scale = h * renderer.getPixelRatio() * 0.5;
      (dust.material as THREE.ShaderMaterial).uniforms.uScale.value = scale;
      scene.traverse((o) => {
        if (o instanceof THREE.Points && o.material instanceof THREE.ShaderMaterial) o.material.uniforms.uScale.value = scale;
      });
    };

    const anim = { mode: 'idle' as 'idle' | 'opening' | 'done', start: 0, rotY0: 0, rotYT: 0, flooded: false };
    cap.rotation.x = 0.14;

    const reset = () => {
      anim.mode = 'idle';
      lid.position.set(0, 0, 0);
      lid.rotation.set(0, 0, 0);
      cap.rotation.set(0.14, cap.rotation.y % (Math.PI * 2), 0);
      seamMat.emissiveIntensity = 0;
      (halo.material as THREE.MeshBasicMaterial).opacity = 0;
      inner.intensity = 0;
      shaftMat.uniforms.uOpacity.value = 0;
      shaft.scale.y = 0.01;
      glow.material.opacity = 0;
      glow.scale.setScalar(0.5);
      spot.intensity = 2.4;
      effect.reset();
      placeCamera(0);
    };

    openRef.current = () => {
      if (anim.mode !== 'idle') return;
      anim.mode = 'opening';
      anim.start = performance.now();
      anim.flooded = false;
      anim.rotY0 = cap.rotation.y;
      anim.rotYT = Math.ceil(anim.rotY0 / (Math.PI * 2)) * Math.PI * 2 + Math.PI * 0.25;
      setPhase('opening');
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    const speed = reduce ? 1.6 : 1;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      for (let i = 0; i < DN; i++) {
        let y = dPos.getY(i) + dt * (0.05 + (dSeed[i] % 1) * 0.05);
        if (y > 5.4) y = -1.1;
        dPos.setXYZ(i, dPos.getX(i) + Math.sin(t * 0.3 + dSeed[i]) * dt * 0.02, y, dPos.getZ(i));
      }
      dPos.needsUpdate = true;

      if (anim.mode === 'idle') {
        cap.rotation.y += dt * 0.16;
        beamMat.uniforms.uOpacity.value = 0.2 + Math.sin(t * 0.5) * 0.02;
      } else if (anim.mode === 'opening') {
        const s = ((now - anim.start) / 1000) * speed;
        // 1) Turn to face the viewer, the light gathers.
        const p0 = inOut(clamp(s / 1.0));
        cap.rotation.y = anim.rotY0 + (anim.rotYT - anim.rotY0) * p0;
        cap.rotation.x = 0.14 + 0.1 * p0;
        spot.intensity = 2.4 + 1.2 * p0;
        // 2) The seam ignites.
        const p1 = outQuart(clamp((s - 0.7) / 0.9));
        seamMat.emissiveIntensity = p1 * 5;
        (halo.material as THREE.MeshBasicMaterial).opacity = p1 * 0.85 * (1 - clamp((s - 2.2) / 0.8) * 0.6);
        // 3) The capsule opens its own way; light leaves it.
        effect.update(s, dt, t);
        const p2 = inOut(clamp((s - 1.6) / 1.6));
        shaftMat.uniforms.uOpacity.value = p2 * 0.75;
        shaft.scale.y = 0.01 + p2 * 0.99;
        beamMat.uniforms.uOpacity.value = 0.2 * (1 - p2 * 0.7);
        glow.position.set(0, 0.25, 0).applyMatrix4(cap.matrixWorld);
        // 4) The camera rises into the light.
        const p3 = reduce ? 0 : inOut(clamp((s - 2.6) / 1.6));
        placeCamera(p3);
        glow.material.opacity = Math.min(1, p2 * 0.8 + p3 * 0.4);
        glow.scale.setScalar(0.5 + p2 * 3.5 + p3 * 10);

        if (s >= FLOOD_AT && !anim.flooded) {
          anim.flooded = true;
          setPhase('flood');
        }
        if (s >= ARRIVE_AT) {
          anim.mode = 'done';
          setPhase('arrived');
          window.location.replace(gacha.url);
        }
      }
      if (anim.mode !== 'done') renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    // Returning with the back button restores the page from cache: start over.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        reset();
        setPhase('idle');
      }
    };
    window.addEventListener('pageshow', onShow);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pageshow', onShow);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
          o.geometry?.dispose();
          const m = o.material as THREE.Material | THREE.Material[];
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
      soft.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [gacha]);

  const open = useCallback(() => openRef.current(), []);
  const { look } = gacha;

  return (
    <main className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {phase === 'idle' && <button type="button" className={styles.stage} aria-label="Kapsel öffnen" onClick={open} />}
      <p className={styles.hint} style={{ opacity: phase === 'idle' ? 1 : 0 }}>
        Zum Öffnen berühren
      </p>
      <div className={styles.flood} aria-hidden="true" style={{ background: look.flood, opacity: phase === 'flood' || phase === 'arrived' ? 1 : 0 }} />
      {phase === 'arrived' && (
        <div className={styles.end} role="status" style={{ background: look.flood, color: look.ink }}>
          <p className={styles.endLabel}>Weiterleitung zu</p>
          <a className={styles.endLink} href={gacha.url} style={{ color: look.ink }}>
            {hostOf(gacha.url)}
          </a>
        </div>
      )}
      <noscript>
        <a className={styles.noscript} href={gacha.url}>
          Weiter zu {hostOf(gacha.url)}
        </a>
      </noscript>
    </main>
  );
}
