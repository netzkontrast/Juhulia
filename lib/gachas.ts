export type Effect = 'mist' | 'wine' | 'orbit';

export type Gacha = {
  slug: string;
  name: string;
  /** External destination the capsule forwards to. */
  url: string;
  effect: Effect;
  look: {
    /** Upper half of the capsule. */
    top: { color: string; roughness: number; metalness: number };
    /** Lower half of the capsule. */
    base: { color: string; roughness: number; metalness: number };
    seam: string;
    /** The single light colour of the scene. */
    light: string;
    /** Colour the screen fills with before forwarding. */
    flood: string;
    /** Text colour on the flood. */
    ink: string;
  };
};

export const gachas: Gacha[] = [
  {
    slug: 'zense',
    name: 'zense',
    url: 'https://zenseofficial.de/',
    effect: 'mist',
    look: {
      top: { color: '#d8d1c6', roughness: 0.32, metalness: 0 },
      base: { color: '#3d2914', roughness: 0.14, metalness: 0.1 },
      seam: '#b9a27a',
      light: '#f2ddb0',
      flood: '#efe6d6',
      ink: '#2a2420',
    },
  },
  {
    slug: 'henne',
    name: 'Henne.',
    url: 'https://henne-weinbar.de/',
    effect: 'wine',
    look: {
      top: { color: '#3a0703', roughness: 0.05, metalness: 0 },
      base: { color: '#1d1715', roughness: 0.38, metalness: 0.2 },
      seam: '#a8834f',
      light: '#ffc98a',
      flood: '#5e0c00',
      ink: '#f4e6dc',
    },
  },
  {
    slug: 'phantasialand',
    name: 'Phantasialand',
    url: 'https://www.phantasialand.de/de/',
    effect: 'orbit',
    look: {
      top: { color: '#121733', roughness: 0.06, metalness: 0.1 },
      base: { color: '#161a33', roughness: 0.34, metalness: 0.3 },
      seam: '#f3a154',
      light: '#ffd9a8',
      flood: '#f6e9d6',
      ink: '#1d2251',
    },
  },
];

export function getGacha(slug: string): Gacha | undefined {
  return gachas.find((g) => g.slug === slug);
}

export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
