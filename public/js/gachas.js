// Every capsule: where it leads, how it arrives, how it opens, and its light.
// The capsule itself is the same object on every page; the world around it changes.
export const SITE = 'https://juhulia.vercel.app';

export const GACHAS = {
  zense: {
    name: 'zense',
    url: 'https://zenseofficial.de/',
    entrance: 'drop', // falls from above and bounces onto the altar
    opening: 'incense', // lid unscrews, incense smoke curls out
    light: '#f0c890',
    accent: '#8c6bb0', // violet of the smoke
    flood: '#e8dcc8',
    ink: '#1a1410',
    candles: [[-1.9, -0.6, 1.15], [2.0, -0.9, 0.85], [-1.2, -2.4, 1.45], [1.4, -2.6, 1.7]],
  },
  henne: {
    name: 'Henne.',
    url: 'https://henne-weinbar.de/',
    entrance: 'approach', // glides out of the fog from far away, candles light as it passes
    opening: 'wine', // lid lifts on a hinge like a reliquary, a pool of wine glows
    light: '#ff9a5a',
    accent: '#7a0a06',
    flood: '#e8d6c6',
    ink: '#3a0703',
    candles: [[-1.6, -0.4, 0.9], [-2.2, -1.4, 1.3], [1.7, -0.5, 1.05], [2.3, -1.6, 1.5], [0.9, -3.4, 2.0]],
  },
  phantasialand: {
    name: 'Phantasialand',
    url: 'https://www.phantasialand.de/de/',
    entrance: 'rise', // lightning, then the capsule rises out of a ring in the floor
    opening: 'orbit', // capsule levitates inside turning rings, bats scatter
    light: '#cfd8ff',
    accent: '#f3a154',
    flood: '#ece6da',
    ink: '#1d2251',
    candles: [[-2.0, -0.8, 1.2], [2.1, -0.7, 0.95]],
  },
};
