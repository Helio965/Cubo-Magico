/**
 * Gerador pseudoaleatório determinístico (mulberry32) alimentado por um hash
 * da semente (xmur3). Permite reproduzir exatamente um embaralhamento.
 */
export type Rng = () => number;

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  return mulberry32(xmur3(seed)());
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Semente aleatória legível (ex.: "k3f9-2xq7"). */
export function randomSeed(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const values = new Uint32Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(values);
  else for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 2 ** 32);
  let s = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) s += '-';
    s += alphabet[values[i] % alphabet.length];
  }
  return s;
}
