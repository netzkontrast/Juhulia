// Every capsule: where it leads, how it arrives, what jumps out, and its colours.
// Capsule colours are the real gacha capsules (translucent green, amber, pink);
// each page's ground is the same hue, much darker and quieter.
export const SITE = 'https://juhulia.vercel.app';

export const GACHAS = {
  zense: {
    name: 'zense',
    url: 'https://zenseofficial.de/',
    host: 'zenseofficial.de',
    entrance: 'drop', // falls from above, one heavy rebound
    object: 'flacon', // a perfume flacon that sprays now and then
    label: 'Parfumflakon', // read out when the capsule opens
    color: {
      capsule: '#f2a516', // amber
      ground: '#2a1d0e', // oklch(0.24 0.04 70)
      deep: '#150e06', // oklch(0.16 0.03 70)
      glitter: '#ffd27a',
    },
  },
  henne: {
    name: 'Henne.',
    url: 'https://henne-weinbar.de/',
    host: 'henne-weinbar.de',
    entrance: 'roll', // rolls in out of the depth of the studio
    object: 'wineglass', // a glass of red wine that swirls and sloshes
    label: 'Weinglas', // read out when the capsule opens
    color: {
      capsule: '#f08ca0', // pink
      ground: '#2b151c', // oklch(0.24 0.04 0)
      deep: '#160a0e', // oklch(0.16 0.03 0)
      glitter: '#ffc2cf',
    },
  },
  phantasialand: {
    name: 'Phantasialand',
    url: 'https://www.phantasialand.de/de/',
    host: 'phantasialand.de',
    entrance: 'launch', // catapulted in on a high arc from the side
    object: 'carousel', // a carousel that turns, its horses rising and falling
    label: 'Karussell', // read out when the capsule opens
    color: {
      capsule: '#22a35a', // green
      ground: '#10241a', // oklch(0.24 0.04 155)
      deep: '#08140d', // oklch(0.16 0.03 155)
      glitter: '#b8f5cf',
    },
  },
};
