export interface Level {
  level: number;
  length: number;
  title: string;
}

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 17, 20, 25];
const TITLES = [
  'Primeiro giro',
  'Dois passos',
  'Três passos',
  'Aquecendo',
  'Cinco movimentos',
  'Ganhando ritmo',
  'Sete movimentos',
  'Oito movimentos',
  'Dez movimentos',
  'Doze movimentos',
  'Quase lá',
  'Desafio avançado',
  'Mestre',
  'Embaralhamento completo',
];

export const LEVELS: readonly Level[] = LENGTHS.map((length, i) => ({ level: i + 1, length, title: TITLES[i] }));

/**
 * Semente determinística de cada nível: o estado é sempre o mesmo para um
 * tamanho/nível, e sempre solúvel (é gerado a partir do cubo resolvido).
 */
export const levelSeed = (size: number, level: number) => `cubeforge-nivel-${size}-${level}`;

/** Estrelas: até o "par" (comprimento do embaralhamento) = 3; até o dobro = 2; senão 1. */
export function levelStars(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par * 2) return 2;
  return 1;
}
